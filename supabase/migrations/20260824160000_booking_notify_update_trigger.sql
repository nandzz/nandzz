-- ── Booking notifications: move cancel/reschedule email fully into the DB ─────
--
-- Follow-up to 20260824150000. Originally Next.js called the edge function
-- directly for cancelled/rescheduled. This moves that dispatch onto a DB UPDATE
-- trigger (like `created` and `reminder` already are), so the edge-function URL
-- and shared secret live ONLY in Postgres (Vault) + the edge function — Next.js
-- no longer calls the edge function and no longer needs BOOKING_NOTIFY_SECRET.
--
-- The one thing a trigger can't know is WHO acted (Next talks to the DB as the
-- service role, so auth.uid() is null here). So the cancel/reschedule UPDATE
-- records it in `notify_actor` as part of the same statement, and the trigger
-- reads it. This is ordinary data the mutating code already knows — not an
-- events table.

-- Who performed the last cancel/reschedule ('business' | 'customer'). Written by
-- the /api/widgets/bookings/[token] route in the same UPDATE that changes the
-- booking; read by booking_notify_updated() below. Null ⇒ treated as 'customer'.
alter table public.widget_bookings add column if not exists notify_actor text;

-- ── booking_notify_updated: AFTER UPDATE → edge function ─────────────────────
-- Detects the semantic event from the OLD→NEW diff:
--   • status confirmed→cancelled  ⇒ 'cancelled'  (OLD guard prevents double-send
--     on a repeat cancel)
--   • still confirmed but start time or staff changed ⇒ 'rescheduled'
-- Any other update (e.g. the reminder cron stamping reminder_sent_at, an edited
-- note) matches neither branch and no-ops. Best-effort: unconfigured env (no
-- Vault url) is a silent no-op, same as the insert trigger.
create or replace function public.booking_notify_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event  text;
  v_url    text;
  v_secret text;
begin
  if OLD.status is distinct from 'cancelled' and NEW.status = 'cancelled' then
    v_event := 'cancelled';
  elsif NEW.status = 'confirmed'
    and (NEW.starts_at is distinct from OLD.starts_at
         or NEW.staff_id is distinct from OLD.staff_id) then
    v_event := 'rescheduled';
  else
    return NEW;  -- not a notifiable change
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'booking_notify_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'booking_notify_secret' limit 1;

  if v_url is null then
    return NEW;  -- environment not configured yet: no-op
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-booking-notify-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object(
      'booking_id', NEW.id,
      'event', v_event,
      'actor', coalesce(nullif(NEW.notify_actor, ''), 'customer')
    )
  );

  return NEW;
end;
$$;

-- Fire only when a column that can signal cancel/reschedule is in the SET list —
-- so the reminder cron's reminder_sent_at-only update never even enters the fn.
drop trigger if exists widget_bookings_notify_updated on public.widget_bookings;
create trigger widget_bookings_notify_updated
  after update of status, starts_at, staff_id on public.widget_bookings
  for each row execute function public.booking_notify_updated();
