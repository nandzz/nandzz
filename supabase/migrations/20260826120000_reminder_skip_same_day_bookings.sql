-- ── Reminder dispatch: skip bookings made close to their start time ──────────
--
-- WHY: the day-before reminder is only useful for bookings placed well in
-- advance. When a booking is created less than ~a day before it starts (every
-- same-day booking, and late next-day ones), the confirmation email that just
-- went out already serves as the reminder — a follow-up would be redundant and
-- would land only minutes after the confirmation. This re-issues
-- booking_dispatch_reminders() with one extra predicate on the inner scan:
--   created_at <= starts_at - interval '25 hours'
-- i.e. only remind bookings created at least 25h before they start. The reminder
-- itself still fires in the existing 23–25h-before window, one time per booking
-- (reminder_sent_at dedupe, unchanged). The edge function applies the same rule
-- at the send layer (reminderIsRedundant) as a backstop.
--
-- Everything else (window, batching, locking, http_post payload) is identical to
-- 20260824150000.

create or replace function public.booking_dispatch_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
  v_row    record;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'booking_notify_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'booking_notify_secret' limit 1;

  if v_url is null then
    return;  -- environment not configured yet: no-op
  end if;

  for v_row in
    update public.widget_bookings b
       set reminder_sent_at = now()
     where b.id in (
       select id from public.widget_bookings
        where status = 'confirmed'
          and reminder_sent_at is null
          and created_at <= starts_at - interval '25 hours'
          and starts_at between now() + interval '23 hours'
                            and now() + interval '25 hours'
        for update skip locked
        limit 200
     )
    returning b.id
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-booking-notify-secret', coalesce(v_secret, '')
      ),
      body := jsonb_build_object(
        'booking_id', v_row.id,
        'event', 'reminder',
        'actor', 'system'
      )
    );
  end loop;
end;
$$;
