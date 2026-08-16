-- Billing model overhaul (part 4/4): widgets become a plan feature.
--
-- Widget entitlement is now the user's plan (subscription_plans.has_widgets),
-- checked via user_has_entitlement. The per-widget Stripe subscription machinery
-- and the per-instance agent credit allowance are gone. widget_instances.enabled
-- stays as the owner's on/off toggle; widget_catalog becomes a plain catalog.
--
-- Runs AFTER part 3 rewrote create_booking_tx / charge_agent_usage / agent_can_serve
-- to no longer reference has_widget_access, widget_subscriptions, widget_agent_usage
-- or _agent_current_period.

-- ── Drop the retired widget billing/usage RPCs ──────────────────────────────
drop function if exists public.has_widget_access(uuid);
drop function if exists public.grant_widget_subscription(uuid, uuid, uuid, text, text, text, timestamptz, text, timestamptz);
drop function if exists public.grant_widget_comp(uuid, uuid, uuid, text);
drop function if exists public.set_widget_comp_active(uuid, boolean);
drop function if exists public._agent_current_period(uuid);
drop function if exists public.record_agent_usage(uuid, int);
drop function if exists public.agent_within_cap(uuid);

-- ── Drop the retired widget billing/usage tables ────────────────────────────
drop table if exists public.widget_agent_usage;
drop table if exists public.widget_subscriptions;

-- ── widget_catalog: strip all pricing/billing columns ───────────────────────
-- Becomes a plain catalog: id / slug / name / description / icon / active / sort_order.
alter table public.widget_catalog drop column if exists stripe_product_id;
alter table public.widget_catalog drop column if exists stripe_price_id;
alter table public.widget_catalog drop column if exists price_cents;
alter table public.widget_catalog drop column if exists currency;
alter table public.widget_catalog drop column if exists billing_interval;
alter table public.widget_catalog drop column if exists trial_days;
alter table public.widget_catalog drop column if exists monthly_credit_limit;
alter table public.widget_catalog drop column if exists monthly_token_limit;

-- Catalog rows were seeded inactive (off until a Stripe price was synced). With
-- entitlement now on the plan, they should simply be listed — activate them.
update public.widget_catalog set active = true where slug in ('calendar', 'agent');
