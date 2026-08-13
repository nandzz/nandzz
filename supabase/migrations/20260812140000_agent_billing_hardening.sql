-- Hardening for charge_agent_usage (from an audit of 20260812120000):
--   #1 A bare `SELECT … FOR UPDATE` on the period usage row locks nothing when
--      the row doesn't exist yet (first completion(s) of a period), so
--      concurrent completions each read credits_used=0, both allocate from the
--      full allowance, and paid overflow is under-charged. Fix: materialize the
--      row (INSERT … ON CONFLICT DO NOTHING) BEFORE locking it.
--   #6 The function billed p_owner_user_id without checking the instance
--      actually belongs to them. Params come from trusted server code, but
--      verify ownership as defense in depth.
--   #5 Idempotency was a check-then-insert on llm_usage.request_id, which had no
--      unique index — two same-id calls could both pass. Add a unique partial
--      index so the guard is atomic.
--
-- Not addressed here (bigger change, pre-existing behavior): a reservation-less
-- overdraft where N concurrent completions each pass the `paid_credits > 0`
-- pre-check against the same balance and drive it negative. Bounded today by
-- per-owner rate limiting and small per-completion cost; revisit with a hold
-- model if the agent moves to a pricier default model.

-- #5 — make request_id idempotency atomic.
create unique index if not exists llm_usage_request_id_uniq
  on public.llm_usage (request_id)
  where request_id is not null;

create or replace function public.charge_agent_usage(
  p_instance_id   uuid,
  p_owner_user_id uuid,
  p_model_id      uuid,
  p_input_tokens  int,
  p_output_tokens int,
  p_request_id    uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model       public.llm_models%rowtype;
  v_credits     int;
  v_limit       int;
  v_owner       uuid;
  v_period      timestamptz;
  v_used        int;
  v_remaining   int;
  v_from_allow  int;
  v_paid_needed int;
  v_profile     public.profiles%rowtype;
  v_new_paid    int;
begin
  -- Idempotency: a retried request_id is a no-op (matches charge_llm_usage).
  if p_request_id is not null
     and exists (select 1 from public.llm_usage where request_id = p_request_id) then
    return jsonb_build_object('credits', 0, 'from_allowance', 0, 'from_paid', 0, 'duplicate', true);
  end if;

  -- #6 — resolve the instance's allowance AND owner, and refuse to bill an
  -- owner the instance doesn't belong to.
  select wc.monthly_credit_limit, wi.user_id
    into v_limit, v_owner
  from public.widget_instances wi
  join public.widget_catalog wc on wc.id = wi.catalog_id
  where wi.id = p_instance_id;
  if not found then
    raise exception 'widget instance not found' using errcode = 'P0001';
  end if;
  if v_owner is distinct from p_owner_user_id then
    raise exception 'instance owner mismatch' using errcode = 'P0001';
  end if;

  select * into v_model from public.llm_models where id = p_model_id;
  if not found then
    raise exception 'model not found' using errcode = 'P0001';
  end if;

  v_credits := ceil(
      (p_input_tokens::numeric  / 1000.0) * v_model.input_credits_per_1k
    + (p_output_tokens::numeric / 1000.0) * v_model.output_credits_per_1k
  )::int;
  if v_credits < 0 then v_credits := 0; end if;

  v_period := public._agent_current_period(p_instance_id);

  -- #1 — materialize the period row first, THEN lock it, so the allowance split
  -- is serialized even for the first completion(s) of a period.
  insert into public.widget_agent_usage (instance_id, period_start, credits_used, tokens_used)
  values (p_instance_id, v_period, 0, 0)
  on conflict (instance_id, period_start) do nothing;

  select credits_used into v_used
  from public.widget_agent_usage
  where instance_id = p_instance_id and period_start = v_period
  for update;
  v_used := coalesce(v_used, 0);

  if v_limit is null or v_limit <= 0 then
    -- Unlimited included allowance: nothing charged to paid credits.
    v_from_allow  := v_credits;
    v_paid_needed := 0;
  else
    v_remaining   := greatest(v_limit - v_used, 0);
    v_from_allow  := least(v_credits, v_remaining);
    v_paid_needed := v_credits - v_from_allow;
  end if;

  -- We hold the row lock, so credits_used is still v_used here.
  update public.widget_agent_usage
     set credits_used = v_used + v_from_allow,
         tokens_used  = tokens_used + p_input_tokens + p_output_tokens,
         updated_at   = now()
   where instance_id = p_instance_id and period_start = v_period;

  -- Overflow → owner's paid credits + ledger.
  if v_paid_needed > 0 then
    select * into v_profile from public.profiles where id = p_owner_user_id for update;
    if not found then
      raise exception 'owner profile not found' using errcode = 'P0001';
    end if;

    v_new_paid := v_profile.paid_credits - v_paid_needed;
    update public.profiles set paid_credits = v_new_paid where id = p_owner_user_id;

    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_owner_user_id, -v_paid_needed, 'paid', 'llm_agent_chat',
      v_profile.free_space_credits, v_new_paid,
      'widget_instance', p_instance_id::text,
      jsonb_build_object(
        'model_id', p_model_id,
        'model', v_model.provider || '/' || v_model.model_id,
        'input_tokens', p_input_tokens,
        'output_tokens', p_output_tokens,
        'credits_total', v_credits,
        'from_allowance', v_from_allow,
        'from_paid', v_paid_needed,
        'period_start', v_period
      )
    );
  end if;

  -- Analytics: one row per completion, always attributed to the owner.
  insert into public.llm_usage (
    user_id, model_id, role, input_tokens, output_tokens, credits_charged,
    message_id, request_id, space_id
  ) values (
    p_owner_user_id, p_model_id, 'agent_chat', p_input_tokens, p_output_tokens, v_credits,
    null, p_request_id, null
  );

  return jsonb_build_object(
    'credits', v_credits,
    'from_allowance', v_from_allow,
    'from_paid', v_paid_needed
  );
end;
$$;

revoke all on function public.charge_agent_usage(uuid, uuid, uuid, int, int, uuid) from public;
grant execute on function public.charge_agent_usage(uuid, uuid, uuid, int, int, uuid) to service_role;
