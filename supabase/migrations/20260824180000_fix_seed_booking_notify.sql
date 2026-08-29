-- ── Fix: make the booking-notify Vault seeding bulletproof + add a checker ────
-- The upsert-by-name version could leave a stale value or a duplicate row (so the
-- trigger's `limit 1` read a different secret than the edge-fn env, → 401). This
-- version deletes any existing rows for the two names, then creates fresh — one
-- row each, guaranteed to hold exactly what's passed. Both helpers are dropped in
-- a later migration once seeding is confirmed on prod.
create or replace function public.admin_seed_booking_notify(p_url text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from vault.secrets where name in ('booking_notify_url', 'booking_notify_secret');
  perform vault.create_secret(p_url, 'booking_notify_url', 'booking-notifications edge function URL');
  perform vault.create_secret(p_secret, 'booking_notify_secret', 'shared secret for booking-notifications');
end;
$$;

revoke all on function public.admin_seed_booking_notify(text, text) from public;
grant execute on function public.admin_seed_booking_notify(text, text) to service_role;

-- Diagnostics without exposing the secret: how many rows exist per name, whether
-- the url is set, and whether the stored secret equals the one passed in.
create or replace function public.admin_check_booking_notify(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows   int;
  v_url    text;
  v_secret text;
begin
  select count(*) into v_rows
    from vault.secrets where name in ('booking_notify_url', 'booking_notify_secret');
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'booking_notify_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'booking_notify_secret' limit 1;
  return jsonb_build_object(
    'vault_rows', v_rows,
    'url_set', v_url is not null,
    'secret_matches', v_secret is not distinct from p_secret
  );
end;
$$;

revoke all on function public.admin_check_booking_notify(text) from public;
grant execute on function public.admin_check_booking_notify(text) to service_role;
