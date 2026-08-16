-- Billing model overhaul (part 2/4): subscription_plans catalog.
--
-- One row per site-wide plan (free / starter / pro). Mirrors the credit_packs
-- table/RLS style: active rows are public-readable (the pricing page + entitlement
-- checks read them), admins manage. Stripe product/price ids are synced from the
-- admin dashboard later — the seed leaves them null and the free plan never gets
-- a Stripe price.

create table if not exists public.subscription_plans (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null check (slug in ('free', 'starter', 'pro')),
  name              text not null,
  description       text,
  price_cents       int not null default 0 check (price_cents >= 0),
  currency          text not null default 'eur',
  billing_interval  text not null default 'month',
  monthly_credits   int not null default 0,
  space_limit       int,                 -- null = unlimited
  has_widgets       boolean not null default false,
  has_mcp           boolean not null default false,
  has_analytics     boolean not null default false,
  active            boolean not null default true,
  sort_order        int not null default 0,
  stripe_product_id text,
  stripe_price_id   text,
  updated_at        timestamptz not null default now()
);

create index if not exists subscription_plans_active_sort
  on public.subscription_plans(sort_order)
  where active = true;

alter table public.subscription_plans enable row level security;

drop policy if exists "Active plans visible to all" on public.subscription_plans;
create policy "Active plans visible to all"
  on public.subscription_plans for select
  using (active = true);

drop policy if exists "Admins manage plans" on public.subscription_plans;
create policy "Admins manage plans"
  on public.subscription_plans for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.widgets_set_updated_at();

-- Seed the three plans. Prices in EUR cents. Stripe ids left null (admin syncs).
insert into public.subscription_plans
  (slug, name, description, price_cents, currency, monthly_credits, space_limit,
   has_widgets, has_mcp, has_analytics, active, sort_order)
values
  ('free',    'Free',    'Get found & booked. Up to 25 spaces, contents, and a public business page.',
   0,    'eur',    0,   25,   false, false, false, true, 10),
  ('starter', 'Starter', 'Widgets, AI agent, and MCP. 500 AI credits every month.',
   1500, 'eur',  500, null,   true,  true,  false, true, 20),
  ('pro',     'Pro',     'Everything in Starter plus analytics. 1500 AI credits every month.',
   2500, 'eur', 1500, null,   true,  true,  true,  true, 30)
on conflict (slug) do nothing;

-- ── RPC: user_has_entitlement ────────────────────────────────────────────────
-- Single gate the edge functions call to check a user's plan grants a feature.
-- Returns NULL when the user has no matching plan row — callers treat that as
-- "not entitled".
create or replace function public.user_has_entitlement(p_user_id uuid, p_entitlement text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_entitlement
    when 'widgets'   then sp.has_widgets
    when 'mcp'       then sp.has_mcp
    when 'analytics' then sp.has_analytics
    else false
  end
  from public.profiles p
  join public.subscription_plans sp on sp.slug = p.plan_slug
  where p.id = p_user_id;
$$;

revoke all on function public.user_has_entitlement(uuid, text) from public;
grant execute on function public.user_has_entitlement(uuid, text) to authenticated, service_role;
