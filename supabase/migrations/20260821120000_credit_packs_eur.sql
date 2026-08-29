-- Credit packs were the last catalog table still priced in USD; plans and
-- widgets are already EUR. Flip the default and migrate existing rows so future
-- Stripe Price syncs mint EUR prices. Mirrors 20260815120000_widget_eur_trial.
-- (A Stripe Price's currency is immutable, so each pack must be re-synced from
-- the admin panel — or via the cleanup script — to get a fresh EUR Price; the
-- old USD Prices get archived, not deleted, since Stripe never deletes Prices.)
alter table public.credit_packs alter column currency set default 'eur';
update public.credit_packs set currency = 'eur' where currency = 'usd';
