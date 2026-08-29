-- Per-plan free trial. Mirrors widget_catalog.trial_days: applied as
-- trial_period_days on the plan Checkout Session's subscription at subscribe
-- time (0 = no trial). Pure catalog field — it is read at checkout, never
-- baked into the Stripe Price, so changing it needs no Stripe re-sync.
alter table public.subscription_plans
  add column if not exists trial_days int not null default 0 check (trial_days >= 0);
