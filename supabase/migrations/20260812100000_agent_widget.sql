-- Agent widget: an AI assistant embedded on the owner's profile that answers
-- visitor questions and can book on the owner's behalf. Second widget type
-- (after `calendar`) in the widgets framework introduced in
-- 20260804120000_widgets.sql — same catalog/instance/subscription shape,
-- just a new catalog row + a usage-metering table for token caps.

-- ── widget_catalog: monthly_token_limit ──────────────────────────────────────
-- Per-type monthly token cap enforced by agent_within_cap. 0 = unlimited/unset
-- (every existing row, incl. `calendar`, defaults to 0 and is unaffected).
alter table public.widget_catalog
  add column if not exists monthly_token_limit int not null default 0;

-- Seed the agent widget type. Inactive until an admin syncs a recurring
-- Stripe price and flips `active` (same pattern as the calendar seed above).
insert into public.widget_catalog (slug, name, description, icon, price_cents, currency, active, sort_order)
values (
  'agent',
  'AI Agent',
  'An AI assistant on your profile that answers visitors and books on your behalf.',
  'bot',
  1900,
  'usd',
  false,
  20
)
on conflict (slug) do nothing;

-- ── widget_agent_usage ───────────────────────────────────────────────────────
-- Per-instance, per-billing-period token usage. One row per (instance, period
-- bucket); written only via record_agent_usage (service role / SECURITY
-- DEFINER). No client write policy — mirrors widget_subscriptions.
create table if not exists public.widget_agent_usage (
  instance_id  uuid not null references public.widget_instances(id) on delete cascade,
  period_start timestamptz not null,
  tokens_used  bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (instance_id, period_start)
);

alter table public.widget_agent_usage enable row level security;

-- Owner may read their own usage rows (join through widget_instances, same
-- ownership pattern as widget_subscriptions' select policy).
drop policy if exists "owner_read_widget_agent_usage" on public.widget_agent_usage;
create policy "owner_read_widget_agent_usage"
  on public.widget_agent_usage for select
  using (
    exists (
      select 1 from public.widget_instances wi
      where wi.id = widget_agent_usage.instance_id
        and wi.user_id = auth.uid()
    )
  );
-- No INSERT/UPDATE/DELETE policy — writes only via record_agent_usage (service role).

-- ── RPC: _agent_current_period (internal helper) ─────────────────────────────
-- Resolves the current billing-period bucket for an instance so
-- record_agent_usage and agent_within_cap always agree. Prefers the active
-- subscription's current_period_end (bucket start = period end minus one
-- billing interval); falls back to the calendar month when there's no
-- subscription/period info yet.
create or replace function public._agent_current_period(p_instance_id uuid)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period_end timestamptz;
  v_interval   text;
begin
  select ws.current_period_end, wc.billing_interval
    into v_period_end, v_interval
  from public.widget_instances wi
  join public.widget_catalog wc on wc.id = wi.catalog_id
  left join public.widget_subscriptions ws
    on ws.instance_id = wi.id
   and ws.status in ('active', 'trialing')
  where wi.id = p_instance_id
  order by ws.current_period_end desc nulls last
  limit 1;

  if v_period_end is not null then
    return v_period_end - case when v_interval = 'year' then interval '1 year' else interval '1 month' end;
  end if;

  return date_trunc('month', now());
end;
$$;

revoke all on function public._agent_current_period(uuid) from public;
grant execute on function public._agent_current_period(uuid) to service_role;

-- ── RPC: record_agent_usage ───────────────────────────────────────────────────
-- Increments token usage for the instance's current billing period. Called by
-- the agent chat backend (service role) after each completion.
create or replace function public.record_agent_usage(p_instance_id uuid, p_tokens int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period timestamptz;
begin
  if p_tokens is null or p_tokens <= 0 then
    return;
  end if;

  v_period := public._agent_current_period(p_instance_id);

  insert into public.widget_agent_usage (instance_id, period_start, tokens_used, updated_at)
  values (p_instance_id, v_period, p_tokens, now())
  on conflict (instance_id, period_start)
  do update set
    tokens_used = public.widget_agent_usage.tokens_used + excluded.tokens_used,
    updated_at  = now();
end;
$$;

revoke all on function public.record_agent_usage(uuid, int) from public;
grant execute on function public.record_agent_usage(uuid, int) to service_role;

-- ── RPC: agent_within_cap ─────────────────────────────────────────────────────
-- True when the instance's catalog has no cap (monthly_token_limit <= 0) or
-- usage in the current period is still under it. Safe for clients (returns
-- only a boolean) so the agent chat UI can pre-check before sending.
create or replace function public.agent_within_cap(p_instance_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit  int;
  v_period timestamptz;
  v_used   bigint;
begin
  select wc.monthly_token_limit into v_limit
  from public.widget_instances wi
  join public.widget_catalog wc on wc.id = wi.catalog_id
  where wi.id = p_instance_id;

  if v_limit is null or v_limit <= 0 then
    return true;
  end if;

  v_period := public._agent_current_period(p_instance_id);

  select coalesce(sum(tokens_used), 0) into v_used
  from public.widget_agent_usage
  where instance_id = p_instance_id
    and period_start = v_period;

  return v_used < v_limit;
end;
$$;

revoke all on function public.agent_within_cap(uuid) from public;
grant execute on function public.agent_within_cap(uuid) to authenticated, service_role;
