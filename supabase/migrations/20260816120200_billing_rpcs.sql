-- Billing model overhaul (part 3/4): RPCs.
--
-- Rewrites every credit RPC for the plan+paid model:
--   * plan_credits  — monthly allowance, reset each billing period, spent FIRST
--   * paid_credits  — purchased top-ups, never expire, spent AFTER plan_credits
-- Publishing a space is free but capped by the plan's space_limit. Widgets/MCP/
-- analytics are gated on plan entitlements (user_has_entitlement, part 2).
--
-- credit_ledger rows keep the balance_after_free / balance_after_paid column
-- names; balance_after_free now holds the plan-bucket balance.

-- ══════════════════════════════════════════════════════════════════════════════
-- publish_space_tx — no credit logic; enforce the plan's space_limit instead.
-- ══════════════════════════════════════════════════════════════════════════════
-- Signature changes (p_cost dropped), so remove the old 4-arg overload first.
drop function if exists public.publish_space_tx(uuid, jsonb, uuid, int);

create or replace function public.publish_space_tx(
  p_user_id           uuid,
  p_space_payload     jsonb,
  p_client_request_id uuid
)
returns table (
  space_id     uuid,
  plan_credits int,
  paid_credits int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile        public.profiles%rowtype;
  v_limit          int;
  v_count          int;
  v_existing_space uuid;
  v_new_space_id   uuid;
  v_content_type   text;
begin
  if p_user_id is null then
    raise exception 'user_id required' using errcode = 'P0001';
  end if;

  -- Idempotent retry: if a row already exists for this client_request_id, return it.
  if p_client_request_id is not null then
    select id into v_existing_space
    from public.spaces
    where user_id = p_user_id and client_request_id = p_client_request_id;

    if v_existing_space is not null then
      return query
        select v_existing_space, p.plan_credits, p.paid_credits
        from public.profiles p where p.id = p_user_id;
      return;
    end if;
  end if;

  -- Lock the profile to serialize concurrent publishes against the space cap.
  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  -- Space cap: read the caller's plan limit; null = unlimited.
  select sp.space_limit into v_limit
  from public.subscription_plans sp
  where sp.slug = v_profile.plan_slug;

  if v_limit is not null then
    select count(*) into v_count from public.spaces where user_id = p_user_id;
    if v_count >= v_limit then
      raise exception 'SPACE_LIMIT_REACHED' using errcode = 'P0001';
    end if;
  end if;

  v_content_type := coalesce(
    p_space_payload->>'content_type',
    case
      when p_space_payload->>'markdown_content' is not null then 'notes'
      when p_space_payload->>'video_url' is not null then 'video'
      when p_space_payload->>'image_url' is not null then 'image'
      when p_space_payload->>'pdf_url' is not null then 'pdf'
      when p_space_payload->>'html_url' is not null then 'html'
      when p_space_payload->>'url' is not null then 'link'
    end
  );

  insert into public.spaces (
    user_id, title, description, url, html_url, pdf_url, image_url, video_url,
    markdown_content, preview_image_url, preview_gradient, preview_title,
    is_public, hashtags, client_request_id, content_type
  )
  values (
    p_user_id,
    p_space_payload->>'title',
    p_space_payload->>'description',
    p_space_payload->>'url',
    p_space_payload->>'html_url',
    p_space_payload->>'pdf_url',
    p_space_payload->>'image_url',
    p_space_payload->>'video_url',
    p_space_payload->>'markdown_content',
    p_space_payload->>'preview_image_url',
    coalesce(p_space_payload->>'preview_gradient', 'violet'),
    p_space_payload->>'preview_title',
    coalesce((p_space_payload->>'is_public')::boolean, true),
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(p_space_payload->'hashtags')),
      '{}'::text[]
    ),
    p_client_request_id,
    v_content_type
  )
  returning id into v_new_space_id;

  return query select v_new_space_id, v_profile.plan_credits, v_profile.paid_credits;
end;
$$;

revoke all on function public.publish_space_tx(uuid, jsonb, uuid) from public;
grant execute on function public.publish_space_tx(uuid, jsonb, uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- assert_min_credits — plan_credits + paid_credits combined.
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function public.assert_min_credits(
  p_user_id uuid,
  p_min     int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  select plan_credits + paid_credits into v_total
  from public.profiles where id = p_user_id;
  if v_total is null then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;
  if v_total < p_min then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.assert_min_credits(uuid, int) from public;
grant execute on function public.assert_min_credits(uuid, int) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- reserve_llm_credits — atomic hold, drawn plan-first then paid.
-- ══════════════════════════════════════════════════════════════════════════════
-- Records the plan/paid split in the hold ledger rows so charge_llm_usage /
-- refund_llm_reservation can restore each bucket exactly. Idempotent by request.
create or replace function public.reserve_llm_credits(
  p_user_id    uuid,
  p_amount     int,
  p_request_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile   public.profiles%rowtype;
  v_use_plan  int;
  v_use_paid  int;
  v_new_plan  int;
  v_new_paid  int;
begin
  if p_amount <= 0 then
    raise exception 'reservation amount must be positive' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.credit_ledger
    where related_entity_id = p_request_id::text
      and reason = 'llm_reservation_hold'
      and delta < 0
  ) then
    return p_amount;
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  if v_profile.plan_credits + v_profile.paid_credits < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  v_use_plan := least(greatest(v_profile.plan_credits, 0), p_amount);
  v_use_paid := p_amount - v_use_plan;
  v_new_plan := v_profile.plan_credits - v_use_plan;
  v_new_paid := v_profile.paid_credits - v_use_paid;

  update public.profiles
  set plan_credits = v_new_plan, paid_credits = v_new_paid
  where id = p_user_id;

  if v_use_plan > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, -v_use_plan, 'plan', 'llm_reservation_hold',
      v_new_plan, v_new_paid,
      'ai_edit_job', p_request_id::text, jsonb_build_object('reserved', p_amount)
    );
  end if;
  if v_use_paid > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, -v_use_paid, 'paid', 'llm_reservation_hold',
      v_new_plan, v_new_paid,
      'ai_edit_job', p_request_id::text, jsonb_build_object('reserved', p_amount)
    );
  end if;

  return p_amount;
end;
$$;

revoke all on function public.reserve_llm_credits(uuid, int, uuid) from public;
grant execute on function public.reserve_llm_credits(uuid, int, uuid) to service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- refund_llm_reservation — release a hold, restoring each bucket's share.
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function public.refund_llm_reservation(
  p_user_id    uuid,
  p_amount     int,
  p_request_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile   public.profiles%rowtype;
  v_ref_plan  int;
  v_ref_paid  int;
  v_new_plan  int;
  v_new_paid  int;
begin
  if p_amount <= 0 then
    return 0;
  end if;

  if exists (
    select 1 from public.credit_ledger
    where related_entity_id = p_request_id::text
      and reason = 'llm_reservation_refund'
      and delta > 0
  ) then
    return 0;
  end if;

  -- Skip if a settlement already released this hold.
  if exists (
    select 1 from public.credit_ledger
    where related_entity_id = p_request_id::text
      and reason = 'llm_reservation_release'
  ) then
    return 0;
  end if;

  -- Recover the plan/paid split from the hold rows (deltas are negative).
  select
    coalesce(-sum(delta) filter (where bucket = 'plan'), 0),
    coalesce(-sum(delta) filter (where bucket = 'paid'), 0)
    into v_ref_plan, v_ref_paid
  from public.credit_ledger
  where related_entity_id = p_request_id::text
    and reason = 'llm_reservation_hold';

  if v_ref_plan + v_ref_paid = 0 then
    return 0;
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  v_new_plan := v_profile.plan_credits + v_ref_plan;
  v_new_paid := v_profile.paid_credits + v_ref_paid;

  update public.profiles
  set plan_credits = v_new_plan, paid_credits = v_new_paid
  where id = p_user_id;

  if v_ref_plan > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, v_ref_plan, 'plan', 'llm_reservation_refund',
      v_new_plan, v_new_paid,
      'ai_edit_job', p_request_id::text, jsonb_build_object('refunded', v_ref_plan + v_ref_paid)
    );
  end if;
  if v_ref_paid > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, v_ref_paid, 'paid', 'llm_reservation_refund',
      v_new_plan, v_new_paid,
      'ai_edit_job', p_request_id::text, jsonb_build_object('refunded', v_ref_plan + v_ref_paid)
    );
  end if;

  return v_ref_plan + v_ref_paid;
end;
$$;

revoke all on function public.refund_llm_reservation(uuid, int, uuid) from public;
grant execute on function public.refund_llm_reservation(uuid, int, uuid) to service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- charge_llm_usage — settle real LLM cost, spending plan_credits then paid.
-- ══════════════════════════════════════════════════════════════════════════════
-- When p_credits_reserved > 0 the caller already deducted a hold (reserve_llm_
-- credits); this releases that hold (restoring the exact plan/paid split it took)
-- and charges the real cost plan-first, paid-second. Idempotent by request_id.
create or replace function public.charge_llm_usage(
  p_user_id          uuid,
  p_model_id         uuid,
  p_role             text,
  p_input_tokens     int,
  p_output_tokens    int,
  p_message_id       text,
  p_request_id       uuid,
  p_space_id         uuid default null,
  p_credits_reserved int  default 0
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model         public.llm_models%rowtype;
  v_credits       int;
  v_reserved      int := coalesce(p_credits_reserved, 0);
  v_profile       public.profiles%rowtype;
  v_rel_plan      int := 0;
  v_rel_paid      int := 0;
  v_plan          int;
  v_paid          int;
  v_use_plan      int;
  v_use_paid      int;
  v_ledger_reason text;
begin
  if p_role not in ('agent_chat', 'page_editor') then
    raise exception 'invalid role' using errcode = 'P0001';
  end if;

  if p_request_id is not null
     and exists (select 1 from public.llm_usage where request_id = p_request_id) then
    return 0;
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

  v_ledger_reason := case p_role
    when 'agent_chat'  then 'llm_agent_chat'
    when 'page_editor' then 'llm_page_editor'
  end;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  -- Recover the reservation split (if any) so we release to the right buckets.
  if v_reserved > 0 then
    select
      coalesce(-sum(delta) filter (where bucket = 'plan'), 0),
      coalesce(-sum(delta) filter (where bucket = 'paid'), 0)
      into v_rel_plan, v_rel_paid
    from public.credit_ledger
    where related_entity_id = p_request_id::text
      and reason = 'llm_reservation_hold';
  end if;

  -- Effective balances after releasing the hold back.
  v_plan := v_profile.plan_credits + v_rel_plan;
  v_paid := v_profile.paid_credits + v_rel_paid;

  -- Spend real cost: plan first, then paid (paid may overdraft — best effort,
  -- we already paid the vendor).
  v_use_plan := least(greatest(v_plan, 0), v_credits);
  v_use_paid := v_credits - v_use_plan;
  v_plan := v_plan - v_use_plan;
  v_paid := v_paid - v_use_paid;

  update public.profiles
  set plan_credits = v_plan, paid_credits = v_paid
  where id = p_user_id;

  insert into public.llm_usage (
    user_id, model_id, role, input_tokens, output_tokens, credits_charged,
    message_id, request_id, space_id
  ) values (
    p_user_id, p_model_id, p_role, p_input_tokens, p_output_tokens, v_credits,
    p_message_id, p_request_id, p_space_id
  );

  -- Reservation release rows (informational — balances net to zero vs the hold).
  if v_rel_plan > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason, balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, v_rel_plan, 'plan', 'llm_reservation_release', v_plan, v_paid,
      'ai_edit_job', p_request_id::text, jsonb_build_object('released', v_rel_plan + v_rel_paid)
    );
  end if;
  if v_rel_paid > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason, balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, v_rel_paid, 'paid', 'llm_reservation_release', v_plan, v_paid,
      'ai_edit_job', p_request_id::text, jsonb_build_object('released', v_rel_plan + v_rel_paid)
    );
  end if;

  -- Charge rows.
  if v_use_plan > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason, balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, -v_use_plan, 'plan', v_ledger_reason, v_plan, v_paid,
      'llm_usage', p_request_id::text,
      jsonb_build_object(
        'model_id', p_model_id, 'model', v_model.provider || '/' || v_model.model_id,
        'input_tokens', p_input_tokens, 'output_tokens', p_output_tokens
      )
    );
  end if;
  if v_use_paid > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason, balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, -v_use_paid, 'paid', v_ledger_reason, v_plan, v_paid,
      'llm_usage', p_request_id::text,
      jsonb_build_object(
        'model_id', p_model_id, 'model', v_model.provider || '/' || v_model.model_id,
        'input_tokens', p_input_tokens, 'output_tokens', p_output_tokens
      )
    );
  end if;

  return v_credits;
end;
$$;

revoke all on function public.charge_llm_usage(uuid, uuid, text, int, int, text, uuid, uuid, int) from public;
grant execute on function public.charge_llm_usage(uuid, uuid, text, int, int, text, uuid, uuid, int) to service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- charge_agent_usage — bill the OWNER's plan_credits then paid_credits.
-- ══════════════════════════════════════════════════════════════════════════════
-- The `agent` widget is now just a plan feature; there is no per-instance monthly
-- allowance. Converts tokens→credits (same llm_models rates) and draws the
-- owner's plan_credits first, then paid_credits. Idempotent by request_id.
-- p_instance_id is kept only to verify ownership + for ledger attribution.
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
  v_model      public.llm_models%rowtype;
  v_credits    int;
  v_owner      uuid;
  v_profile    public.profiles%rowtype;
  v_plan       int;
  v_paid       int;
  v_use_plan   int;
  v_use_paid   int;
begin
  -- Idempotency: a retried request_id is a no-op.
  if p_request_id is not null
     and exists (select 1 from public.llm_usage where request_id = p_request_id) then
    return jsonb_build_object('credits', 0, 'from_plan', 0, 'from_paid', 0, 'duplicate', true);
  end if;

  -- Verify the instance belongs to the owner we're about to bill.
  select wi.user_id into v_owner
  from public.widget_instances wi
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

  select * into v_profile from public.profiles where id = p_owner_user_id for update;
  if not found then
    raise exception 'owner profile not found' using errcode = 'P0001';
  end if;

  v_use_plan := least(greatest(v_profile.plan_credits, 0), v_credits);
  v_use_paid := v_credits - v_use_plan;
  v_plan := v_profile.plan_credits - v_use_plan;
  v_paid := v_profile.paid_credits - v_use_paid;

  update public.profiles
  set plan_credits = v_plan, paid_credits = v_paid
  where id = p_owner_user_id;

  -- Analytics: one row per completion, always attributed to the owner.
  insert into public.llm_usage (
    user_id, model_id, role, input_tokens, output_tokens, credits_charged,
    message_id, request_id, space_id
  ) values (
    p_owner_user_id, p_model_id, 'agent_chat', p_input_tokens, p_output_tokens, v_credits,
    null, p_request_id, null
  );

  if v_use_plan > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason, balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_owner_user_id, -v_use_plan, 'plan', 'llm_agent_chat', v_plan, v_paid,
      'widget_instance', p_instance_id::text,
      jsonb_build_object(
        'model_id', p_model_id, 'model', v_model.provider || '/' || v_model.model_id,
        'input_tokens', p_input_tokens, 'output_tokens', p_output_tokens,
        'credits_total', v_credits, 'from_plan', v_use_plan, 'from_paid', v_use_paid
      )
    );
  end if;
  if v_use_paid > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason, balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_owner_user_id, -v_use_paid, 'paid', 'llm_agent_chat', v_plan, v_paid,
      'widget_instance', p_instance_id::text,
      jsonb_build_object(
        'model_id', p_model_id, 'model', v_model.provider || '/' || v_model.model_id,
        'input_tokens', p_input_tokens, 'output_tokens', p_output_tokens,
        'credits_total', v_credits, 'from_plan', v_use_plan, 'from_paid', v_use_paid
      )
    );
  end if;

  return jsonb_build_object(
    'credits', v_credits, 'from_plan', v_use_plan, 'from_paid', v_use_paid
  );
end;
$$;

revoke all on function public.charge_agent_usage(uuid, uuid, uuid, int, int, uuid) from public;
grant execute on function public.charge_agent_usage(uuid, uuid, uuid, int, int, uuid) to service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- agent_can_serve — owner has plan_credits + paid_credits to spend.
-- ══════════════════════════════════════════════════════════════════════════════
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
  v_total int;
begin
  select plan_credits + paid_credits into v_total
  from public.profiles where id = p_owner_user_id;
  return coalesce(v_total, 0) > 0;
end;
$$;

revoke all on function public.agent_can_serve(uuid, uuid) from public;
grant execute on function public.agent_can_serve(uuid, uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- grant_credits — Stripe purchases + admin grants. Buckets: plan | paid.
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function public.grant_credits(
  p_user_id           uuid,
  p_bucket            text,
  p_amount            int,
  p_reason            text,
  p_stripe_event_id   text default null,
  p_payment_intent_id text default null,
  p_metadata          jsonb default '{}'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile  public.profiles%rowtype;
  v_new_plan int;
  v_new_paid int;
begin
  if p_bucket not in ('plan', 'paid') then
    raise exception 'invalid bucket' using errcode = 'P0001';
  end if;
  if p_amount = 0 then
    return false;
  end if;
  if p_reason not in (
    'admin_grant','admin_revoke','stripe_purchase','refund','backfill','plan_grant','plan_revoke'
  ) then
    raise exception 'invalid reason' using errcode = 'P0001';
  end if;

  if p_stripe_event_id is not null
     and exists (select 1 from public.credit_ledger where stripe_event_id = p_stripe_event_id) then
    return false;
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  v_new_plan := v_profile.plan_credits;
  v_new_paid := v_profile.paid_credits;

  if p_bucket = 'plan' then
    v_new_plan := v_new_plan + p_amount;
  else
    v_new_paid := v_new_paid + p_amount;
  end if;

  -- Revokes must not drive the touched bucket negative. Refunds are allowed to.
  if p_reason in ('admin_revoke','plan_revoke')
     and (
       (p_bucket = 'plan' and v_new_plan < 0)
       or (p_bucket = 'paid' and v_new_paid < 0)
     ) then
    raise exception 'INSUFFICIENT_BALANCE' using errcode = 'P0001';
  end if;

  if p_bucket = 'plan' then
    update public.profiles set plan_credits = v_new_plan where id = p_user_id;
  else
    update public.profiles set paid_credits = v_new_paid where id = p_user_id;
  end if;

  insert into public.credit_ledger (
    user_id, delta, bucket, reason,
    balance_after_free, balance_after_paid,
    stripe_event_id, stripe_payment_intent_id, metadata
  ) values (
    p_user_id, p_amount, p_bucket, p_reason,
    v_new_plan, v_new_paid,
    p_stripe_event_id, p_payment_intent_id, coalesce(p_metadata, '{}'::jsonb)
  );

  return true;
end;
$$;

revoke all on function public.grant_credits(uuid, text, int, text, text, text, jsonb) from public;
grant execute on function public.grant_credits(uuid, text, int, text, text, text, jsonb) to service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- refill_plan_credits — reset the monthly plan allowance for a slug.
-- ══════════════════════════════════════════════════════════════════════════════
-- Sets plan_credits = the plan's monthly_credits (leftover plan credits do NOT
-- roll over) and records a 'plan_refill' ledger row in the 'plan' bucket.
create or replace function public.refill_plan_credits(
  p_user_id   uuid,
  p_plan_slug text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly  int;
  v_profile  public.profiles%rowtype;
  v_delta    int;
begin
  select monthly_credits into v_monthly
  from public.subscription_plans where slug = p_plan_slug;
  if not found then
    raise exception 'plan not found: %', p_plan_slug using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  v_delta := v_monthly - v_profile.plan_credits;

  update public.profiles set plan_credits = v_monthly where id = p_user_id;

  if v_delta <> 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid, metadata
    ) values (
      p_user_id, v_delta, 'plan', 'plan_refill',
      v_monthly, v_profile.paid_credits,
      jsonb_build_object('plan_slug', p_plan_slug, 'monthly_credits', v_monthly)
    );
  end if;

  return v_monthly;
end;
$$;

revoke all on function public.refill_plan_credits(uuid, text) from public;
grant execute on function public.refill_plan_credits(uuid, text) to service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- set_user_plan — upsert plan state from a Stripe subscription event.
-- ══════════════════════════════════════════════════════════════════════════════
-- Refills plan_credits only when the plan first BECOMES active (new slug or a
-- transition out of a non-active status) — so repeated subscription.updated
-- events don't wipe mid-period consumption. Period renewals refill via
-- refill_plan_credits (called from the invoice.paid webhook path).
create or replace function public.set_user_plan(
  p_user_id    uuid,
  p_plan_slug  text,
  p_status     text,
  p_sub_id     text,
  p_period_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old           public.profiles%rowtype;
  v_became_active boolean;
begin
  if not exists (select 1 from public.subscription_plans where slug = p_plan_slug) then
    raise exception 'plan not found: %', p_plan_slug using errcode = 'P0001';
  end if;

  select * into v_old from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  v_became_active :=
    p_status in ('active', 'trialing')
    and (
      v_old.plan_slug is distinct from p_plan_slug
      or coalesce(v_old.plan_status, '') not in ('active', 'trialing')
    );

  update public.profiles set
    plan_slug                   = p_plan_slug,
    plan_status                 = p_status,
    plan_stripe_subscription_id = p_sub_id,
    plan_current_period_end     = p_period_end
  where id = p_user_id;

  if v_became_active then
    perform public.refill_plan_credits(p_user_id, p_plan_slug);
  end if;
end;
$$;

revoke all on function public.set_user_plan(uuid, text, text, text, timestamptz) from public;
grant execute on function public.set_user_plan(uuid, text, text, text, timestamptz) to service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- handle_new_user / claim_signup_profile — no signup credit grant anymore.
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'username' is not null then
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      new.raw_user_meta_data->>'username',
      coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Return columns change (free_space_credits → plan_slug), so drop first.
drop function if exists public.claim_signup_profile(text, text);

create or replace function public.claim_signup_profile(
  p_username     text,
  p_display_name text default null
)
returns table (
  profile_id uuid,
  plan_slug  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_existing public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_username is null
     or length(p_username) < 3 or length(p_username) > 30
     or p_username !~ '^[a-z0-9_-]+$' then
    raise exception 'INVALID_USERNAME' using errcode = 'P0001';
  end if;

  select * into v_existing from public.profiles where id = v_uid;
  if v_existing.id is not null then
    return query select v_existing.id, v_existing.plan_slug;
    return;
  end if;

  begin
    insert into public.profiles (id, username, display_name)
    values (
      v_uid,
      p_username,
      coalesce(nullif(p_display_name, ''), p_username)
    );
  exception when unique_violation then
    raise exception 'USERNAME_TAKEN' using errcode = 'P0001';
  end;

  return query select v_uid, 'free'::text;
end;
$$;

revoke all on function public.claim_signup_profile(text, text) from public;
grant execute on function public.claim_signup_profile(text, text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- create_booking_tx — gate on the owner's plan.has_widgets (not has_widget_access).
-- ══════════════════════════════════════════════════════════════════════════════
-- Identical to the location-aware version from 20260806090000_widget_locations.sql
-- except the entitlement check: widget access is now a plan feature, keyed on the
-- instance owner's plan, rather than a per-instance Stripe subscription.
create or replace function public.create_booking_tx(
  p_instance_id    uuid,
  p_service_id     text,
  p_starts_at      timestamptz,
  p_customer_name  text,
  p_customer_email text,
  p_customer_phone text default null,
  p_notes          text default null,
  p_created_by     uuid default null,
  p_staff_id       text default null,
  p_location_id    text default null
)
returns public.widget_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instance    public.widget_instances%rowtype;
  v_config      jsonb;
  v_tz          text;
  v_location    jsonb;
  v_location_name text;
  v_availability  jsonb;
  v_blackout_dates jsonb;
  v_services_src  jsonb;
  v_staff_src     jsonb;
  v_service     jsonb;
  v_duration    int;
  v_ends_at     timestamptz;
  v_local       timestamp;   -- wall-clock time in the resolved tz
  v_dow         text;
  v_dow_names   text[] := array['mon','tue','wed','thu','fri','sat','sun'];
  v_start_min   int;
  v_end_min     int;
  v_window      jsonb;
  v_win_start   int;
  v_win_end     int;
  v_fits        boolean := false;
  v_date_str    text;
  v_staff_all   jsonb;
  v_svc_staff   jsonb;
  v_req_staff   text;
  v_staff       jsonb;
  v_candidates  jsonb := '[]'::jsonb;
  v_cand        jsonb;
  v_booking     public.widget_bookings%rowtype;
begin
  if trim(coalesce(p_customer_name, '')) = '' or trim(coalesce(p_customer_email, '')) = '' then
    raise exception 'MISSING_CUSTOMER' using errcode = 'P0001';
  end if;

  select * into v_instance from public.widget_instances where id = p_instance_id;
  if not found or not v_instance.enabled then
    raise exception 'WIDGET_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- Widget entitlement is now a plan feature keyed on the instance owner.
  if not coalesce(public.user_has_entitlement(v_instance.user_id, 'widgets'), false) then
    raise exception 'NO_ACCESS' using errcode = 'P0001';
  end if;

  v_config := coalesce(v_instance.config, '{}'::jsonb);

  if p_location_id is not null then
    select elem into v_location
    from jsonb_array_elements(coalesce(v_config->'locations', '[]'::jsonb)) elem
    where elem->>'id' = p_location_id
    limit 1;

    if v_location is null then
      raise exception 'INVALID_LOCATION' using errcode = 'P0001';
    end if;

    v_location_name  := v_location->>'name';
    v_tz             := coalesce(nullif(v_location->>'timezone', ''), nullif(v_config->>'timezone', ''), 'UTC');
    v_availability   := coalesce(v_location->'availability', '{}'::jsonb);
    v_blackout_dates := coalesce(v_location->'blackout_dates', '[]'::jsonb);
    v_services_src   := coalesce(v_location->'services', '[]'::jsonb);
    v_staff_src      := coalesce(v_location->'staff', '[]'::jsonb);
  else
    v_tz             := coalesce(nullif(v_config->>'timezone', ''), 'UTC');
    v_availability   := coalesce(v_config->'availability', '{}'::jsonb);
    v_blackout_dates := coalesce(v_config->'blackout_dates', '[]'::jsonb);
    v_services_src   := coalesce(v_config->'services', '[]'::jsonb);
    v_staff_src      := coalesce(v_config->'staff', '[]'::jsonb);
  end if;

  select elem into v_service
  from jsonb_array_elements(v_services_src) elem
  where elem->>'id' = p_service_id
  limit 1;

  if v_service is null then
    raise exception 'INVALID_SERVICE' using errcode = 'P0001';
  end if;

  v_duration := coalesce((v_service->>'duration_min')::int, 0);
  if v_duration <= 0 then
    raise exception 'INVALID_SERVICE' using errcode = 'P0001';
  end if;
  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  v_local     := p_starts_at at time zone v_tz;
  v_dow       := v_dow_names[extract(isodow from v_local)::int];
  v_start_min := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  v_end_min   := v_start_min + v_duration;
  v_date_str  := to_char(v_local::date, 'YYYY-MM-DD');

  if v_blackout_dates ? v_date_str then
    raise exception 'BLACKOUT' using errcode = 'P0001';
  end if;

  for v_window in
    select * from jsonb_array_elements(coalesce(v_availability->v_dow, '[]'::jsonb))
  loop
    v_win_start := split_part(v_window->>0, ':', 1)::int * 60 + split_part(v_window->>0, ':', 2)::int;
    v_win_end   := split_part(v_window->>1, ':', 1)::int * 60 + split_part(v_window->>1, ':', 2)::int;
    if v_start_min >= v_win_start and v_end_min <= v_win_end then
      v_fits := true;
      exit;
    end if;
  end loop;

  if not v_fits then
    raise exception 'OUT_OF_HOURS' using errcode = 'P0001';
  end if;

  v_staff_all := v_staff_src;

  if jsonb_array_length(v_staff_all) = 0 then
    begin
      insert into public.widget_bookings (
        instance_id, owner_user_id, service_id, service_name, duration_min, price_cents,
        starts_at, ends_at, customer_name, customer_email, customer_phone, notes,
        manage_token, created_by_user_id, location_id, location_name
      ) values (
        p_instance_id, v_instance.user_id, p_service_id, v_service->>'name', v_duration,
        nullif(v_service->>'price_cents', '')::int,
        p_starts_at, v_ends_at, p_customer_name, p_customer_email, p_customer_phone, p_notes,
        encode(extensions.gen_random_bytes(16), 'hex'), p_created_by,
        p_location_id, v_location_name
      )
      returning * into v_booking;
    exception when exclusion_violation then
      raise exception 'SLOT_TAKEN' using errcode = 'P0001';
    end;

    return v_booking;
  end if;

  v_svc_staff := v_service->'staff_ids';
  v_req_staff := nullif(p_staff_id, '');

  for v_staff in select * from jsonb_array_elements(v_staff_all)
  loop
    if v_svc_staff is not null
       and jsonb_typeof(v_svc_staff) = 'array'
       and jsonb_array_length(v_svc_staff) > 0
       and not (v_svc_staff ? (v_staff->>'id')) then
      continue;
    end if;

    if v_req_staff is not null and (v_staff->>'id') <> v_req_staff then
      continue;
    end if;

    if coalesce(v_staff->'blackout_dates', '[]'::jsonb) ? v_date_str then
      continue;
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(coalesce(v_staff->'availability'->v_dow, '[]'::jsonb)) w
      where split_part(w->>0, ':', 1)::int * 60 + split_part(w->>0, ':', 2)::int <= v_start_min
        and v_end_min <= split_part(w->>1, ':', 1)::int * 60 + split_part(w->>1, ':', 2)::int
    ) then
      continue;
    end if;

    v_candidates := v_candidates
      || jsonb_build_array(jsonb_build_object('id', v_staff->>'id', 'name', v_staff->>'name'));
  end loop;

  if jsonb_array_length(v_candidates) = 0 then
    raise exception 'STAFF_UNAVAILABLE' using errcode = 'P0001';
  end if;

  for v_cand in select * from jsonb_array_elements(v_candidates)
  loop
    begin
      insert into public.widget_bookings (
        instance_id, owner_user_id, service_id, service_name, duration_min, price_cents,
        starts_at, ends_at, customer_name, customer_email, customer_phone, notes,
        manage_token, created_by_user_id, staff_id, staff_name, location_id, location_name
      ) values (
        p_instance_id, v_instance.user_id, p_service_id, v_service->>'name', v_duration,
        nullif(v_service->>'price_cents', '')::int,
        p_starts_at, v_ends_at, p_customer_name, p_customer_email, p_customer_phone, p_notes,
        encode(extensions.gen_random_bytes(16), 'hex'), p_created_by,
        v_cand->>'id', v_cand->>'name', p_location_id, v_location_name
      )
      returning * into v_booking;

      return v_booking;
    exception when exclusion_violation then
      continue;
    end;
  end loop;

  raise exception 'SLOT_TAKEN' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_booking_tx(uuid, text, timestamptz, text, text, text, text, uuid, text, text) from public;
grant execute on function public.create_booking_tx(uuid, text, timestamptz, text, text, text, text, uuid, text, text) to service_role;
