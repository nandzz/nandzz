-- Agent widget: switch from a raw monthly TOKEN cap to a monthly CREDIT
-- allowance with paid-credit overflow.
--
-- Before (20260812100000_agent_widget.sql): the `agent` widget metered raw
-- tokens against widget_catalog.monthly_token_limit; visitors chatted free and
-- the agent paused once the token cap was hit (record_agent_usage /
-- agent_within_cap).
--
-- After: an admin sets `monthly_credit_limit` — the credits included with the
-- subscription each billing period. Every completion converts tokens→credits
-- (same llm_models rates as charge_llm_usage) and draws the widget allowance
-- FIRST; any remainder spills over to the owner's profiles.paid_credits (with a
-- credit_ledger row). The allowance refills each billing period. The agent only
-- pauses when the allowance AND the owner's paid credits are both exhausted.

-- ── widget_catalog: monthly_credit_limit ─────────────────────────────────────
-- Credits included per billing period. 0 = unlimited included (never touches
-- paid credits) — same "free/unlimited" semantics the old 0 token cap had.
alter table public.widget_catalog
  add column if not exists monthly_credit_limit int not null default 0;

-- Token values don't translate to credits; admins re-enter the allowance.
alter table public.widget_catalog
  drop column if exists monthly_token_limit;

-- ── widget_agent_usage: credits_used ─────────────────────────────────────────
-- Track allowance consumption in credits (billing) alongside tokens_used
-- (kept for analytics). One row per (instance, period).
alter table public.widget_agent_usage
  add column if not exists credits_used int not null default 0;

-- Retire the token-era RPCs; replaced by charge_agent_usage / agent_can_serve.
drop function if exists public.record_agent_usage(uuid, int);
drop function if exists public.agent_within_cap(uuid);

-- ── RPC: charge_agent_usage ──────────────────────────────────────────────────
-- Called by the agent chat backend (service role) after each completion, for
-- BOTH owner and visitor mode. Converts tokens→credits, consumes the instance's
-- period allowance first, then debits the owner's paid credits for any
-- remainder. Idempotent on p_request_id. Returns the split as jsonb.
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

  select * into v_model from public.llm_models where id = p_model_id;
  if not found then
    raise exception 'model not found' using errcode = 'P0001';
  end if;

  v_credits := ceil(
      (p_input_tokens::numeric  / 1000.0) * v_model.input_credits_per_1k
    + (p_output_tokens::numeric / 1000.0) * v_model.output_credits_per_1k
  )::int;
  if v_credits < 0 then v_credits := 0; end if;

  select wc.monthly_credit_limit into v_limit
  from public.widget_instances wi
  join public.widget_catalog wc on wc.id = wi.catalog_id
  where wi.id = p_instance_id;

  v_period := public._agent_current_period(p_instance_id);

  -- Lock this period's usage row (if any) so the allowance split is consistent.
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

  -- Record allowance consumption (credits) + tokens for the period.
  insert into public.widget_agent_usage (instance_id, period_start, credits_used, tokens_used, updated_at)
  values (p_instance_id, v_period, v_from_allow, p_input_tokens + p_output_tokens, now())
  on conflict (instance_id, period_start)
  do update set
    credits_used = public.widget_agent_usage.credits_used + excluded.credits_used,
    tokens_used  = public.widget_agent_usage.tokens_used  + excluded.tokens_used,
    updated_at   = now();

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

-- ── RPC: agent_can_serve ─────────────────────────────────────────────────────
-- Pre-send gate. True when the instance can still be served this period:
-- unlimited allowance (limit <= 0), allowance remaining, OR the owner has paid
-- credits to cover overflow. Returns only a boolean.
create or replace function public.agent_can_serve(
  p_instance_id   uuid,
  p_owner_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit  int;
  v_period timestamptz;
  v_used   int;
  v_paid   int;
begin
  select wc.monthly_credit_limit into v_limit
  from public.widget_instances wi
  join public.widget_catalog wc on wc.id = wi.catalog_id
  where wi.id = p_instance_id;

  if v_limit is null or v_limit <= 0 then
    return true;  -- unlimited included allowance
  end if;

  v_period := public._agent_current_period(p_instance_id);

  select coalesce(sum(credits_used), 0) into v_used
  from public.widget_agent_usage
  where instance_id = p_instance_id and period_start = v_period;

  if v_used < v_limit then
    return true;  -- allowance remaining
  end if;

  -- Allowance exhausted → owner needs paid credits to keep serving.
  select coalesce(paid_credits, 0) into v_paid
  from public.profiles where id = p_owner_user_id;

  return v_paid > 0;
end;
$$;

revoke all on function public.agent_can_serve(uuid, uuid) from public;
grant execute on function public.agent_can_serve(uuid, uuid) to service_role;
