-- ── One-time helper: seed the booking-notify Vault secrets ──────────────────
-- The trigger + cron read `booking_notify_url` and `booking_notify_secret` from
-- Supabase Vault (per project, kept out of git). There's no non-interactive
-- `supabase` SQL exec, so this SECURITY DEFINER RPC lets the seeding be done over
-- PostgREST with the service-role key. It ONLY ever writes those two named
-- secrets (idempotent upsert). Dropped again in a follow-up migration once seeded.
create or replace function public.admin_seed_booking_notify(p_url text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'booking_notify_url';
  if v_id is null then
    perform vault.create_secret(p_url, 'booking_notify_url', 'booking-notifications edge function URL');
  else
    perform vault.update_secret(v_id, p_url);
  end if;

  select id into v_id from vault.secrets where name = 'booking_notify_secret';
  if v_id is null then
    perform vault.create_secret(p_secret, 'booking_notify_secret', 'shared secret for booking-notifications');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
end;
$$;

revoke all on function public.admin_seed_booking_notify(text, text) from public;
grant execute on function public.admin_seed_booking_notify(text, text) to service_role;
