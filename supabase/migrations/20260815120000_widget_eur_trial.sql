-- Widget subscriptions are priced in EUR, not USD. Flip the catalog default and
-- migrate existing rows so future Stripe Price syncs mint EUR prices. (Live
-- Stripe Prices already minted in USD keep their currency — Stripe can't change
-- a Price's currency — so each widget must be re-synced from the admin panel to
-- get a fresh EUR Price; existing subscribers keep their USD price until they
-- resubscribe.)
alter table public.widget_catalog alter column currency set default 'eur';
update public.widget_catalog set currency = 'eur' where currency = 'usd';

-- Per-widget free trial. Applied as trial_period_days on the Checkout Session's
-- subscription at subscribe time (0 = no trial).
alter table public.widget_catalog
  add column if not exists trial_days int not null default 0 check (trial_days >= 0);
