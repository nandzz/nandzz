-- Billing model overhaul (part 1/4): profiles + credit_ledger.
--
-- Nandzz is replacing (a) per-space publish credit costs and (b) per-widget
-- Stripe subscriptions with THREE site-wide subscription plans (free / starter
-- / pro). Credits become LLM-only. Widgets/MCP/analytics are plan entitlements.
--
-- Dev-phase clean slate: existing credit history does not matter, so the
-- credit_ledger is truncated and the free-credit economy is dropped outright.
-- Currency is EUR.
--
-- This part reshapes the profiles billing columns and the credit_ledger
-- bucket/reason constraints. Parts 2-4 add subscription_plans, rewrite the
-- RPCs, and strip the old widget billing tables.

-- ── credit_ledger: wipe history, re-bucket (free_space → plan) ───────────────
-- Truncate first so the tightened bucket/reason CHECKs can't trip on legacy
-- 'free_space' / 'publish_space' / 'signup_grant' rows.
truncate table public.credit_ledger restart identity;

-- bucket: 'free_space' → 'plan'. Plan-refilled monthly credits live in the
-- 'plan' bucket; purchased top-ups stay 'paid'.
alter table public.credit_ledger drop constraint if exists credit_ledger_bucket_check;
alter table public.credit_ledger
  add constraint credit_ledger_bucket_check check (bucket in ('plan', 'paid'));

-- reason: drop 'publish_space' (publishing is free now) and 'signup_grant'
-- (no signup grant anymore); add the plan lifecycle reasons.
alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check check (reason in (
  'admin_grant',
  'admin_revoke',
  'stripe_purchase',
  'llm_agent_chat',
  'llm_page_editor',
  'llm_reservation_hold',
  'llm_reservation_release',
  'llm_reservation_refund',
  'plan_refill',
  'plan_grant',
  'plan_revoke',
  'refund',
  'backfill'
));

-- NOTE: the ledger keeps its balance_after_free / balance_after_paid column
-- NAMES for backward compatibility with existing readers, but balance_after_free
-- now carries the *plan* bucket balance (free_space credits no longer exist).

-- ── profiles: drop the free-credit economy, add plan columns ─────────────────
-- Plan state mirrors what Stripe tells us via set_user_plan (part 3). plan_credits
-- is the monthly allowance that resets each billing period; paid_credits (kept)
-- are purchased top-ups that never expire and are only spent after plan_credits.
alter table public.profiles add column if not exists plan_slug text not null default 'free';
alter table public.profiles add column if not exists plan_status text;
alter table public.profiles add column if not exists plan_credits int not null default 0;
alter table public.profiles add column if not exists plan_stripe_subscription_id text;
alter table public.profiles add column if not exists plan_current_period_end timestamptz;

-- Drop the dead free-space economy + the long-dead plan_tier flag.
alter table public.profiles drop column if exists free_space_credits;
alter table public.profiles drop column if exists plan_tier;

create index if not exists idx_profiles_plan_slug on public.profiles(plan_slug);

-- ── app_settings: drop the now-dead credit knobs ────────────────────────────
delete from public.app_settings where key in ('signup_credit_grant', 'publish_space_cost');
