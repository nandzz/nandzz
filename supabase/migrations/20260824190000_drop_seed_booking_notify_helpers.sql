-- ── Cleanup: drop the one-time booking-notify Vault seeding/checking helpers ──
-- Vault (`booking_notify_url` + `booking_notify_secret`) has been seeded and
-- verified on dev + prod, so these SECURITY DEFINER helpers (which let the
-- service role write/read those Vault secrets) are no longer needed and are
-- removed to avoid leaving a standing Vault-writer around.
drop function if exists public.admin_seed_booking_notify(text, text);
drop function if exists public.admin_check_booking_notify(text);
