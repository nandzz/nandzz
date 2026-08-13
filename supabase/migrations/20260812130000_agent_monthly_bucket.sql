-- Agent credit allowance: always refill MONTHLY, even on annual subscriptions.
--
-- 20260812100000_agent_widget.sql derived the usage bucket from the billing
-- interval: monthly subs got a 1-month bucket, but ANNUAL subs got a single
-- 1-year bucket — so an annual subscriber received `monthly_credit_limit`
-- credits for the whole year and it only reset once a year. The allowance is
-- meant to be monthly (field is "Included credits / month"), so bucket monthly
-- regardless of billing interval.
--
-- New logic: anchor monthly boundaries to the subscription's billing day (the
-- day-of-month implied by current_period_end) and return the latest boundary at
-- or before now(). For a monthly sub this is identical to the old
-- `current_period_end - 1 month`; for an annual sub it advances every month.
-- Falls back to the calendar month when there's no subscription period yet.
create or replace function public._agent_current_period(p_instance_id uuid)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period_end timestamptz;
  v_anchor     timestamptz;
begin
  select ws.current_period_end
    into v_period_end
  from public.widget_instances wi
  left join public.widget_subscriptions ws
    on ws.instance_id = wi.id
   and ws.status in ('active', 'trialing')
  where wi.id = p_instance_id
  order by ws.current_period_end desc nulls last
  limit 1;

  if v_period_end is null then
    return date_trunc('month', now());
  end if;

  -- Step monthly boundaries back from the period end to the latest one that is
  -- at or before now() — the start of the current monthly allowance window.
  -- Bounded to ~12 iterations for an annual period, 1 for a monthly period.
  v_anchor := v_period_end;
  while v_anchor > now() loop
    v_anchor := v_anchor - interval '1 month';
  end loop;

  return v_anchor;
end;
$$;

revoke all on function public._agent_current_period(uuid) from public;
grant execute on function public._agent_current_period(uuid) to service_role;
