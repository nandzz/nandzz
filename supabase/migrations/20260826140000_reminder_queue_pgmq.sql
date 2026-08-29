-- ── Booking reminders: replace the per-row http fan-out with a pgmq queue ─────
--
-- WHY: today booking_dispatch_reminders() (the `booking-reminders` cron, */15)
-- does ONE net.http_post per due booking, capped at LIMIT 200/run. That's a hard
-- ~19k reminders/day ceiling (200 × 96 runs) and it couples the cron's runtime to
-- the edge function's latency — every send blocks inside the DB transaction. This
-- migration decouples ENQUEUE from SEND:
--
--   • The reminder cron becomes a pure DB-local operation: one atomic statement
--     stamps reminder_sent_at on the due rows AND enqueues one pgmq message per
--     row (pgmq.send_batch). No http, no vault reads, no per-row loop — so the
--     LIMIT can safely jump 200 → 5000 (a bulk insert of thousands is trivial).
--
--   • A SEPARATE, faster cron (`booking-notify-drain`, */1) just pings the edge
--     function with {mode:'drain'}. The edge function then reads a batch off the
--     queue (booking_queue_read), sends each email, and deletes/archives the
--     handled messages (booking_queue_delete / booking_queue_archive). Retries,
--     backoff, and throughput now live in the worker, not the DB.
--
-- pgmq access is wrapped in three SECURITY DEFINER functions in `public` so the
-- edge function (service_role via PostgREST rpc) never has to touch the `pgmq`
-- schema directly. Every pgmq.* call below is schema-qualified and every function
-- pins `set search_path = public`.
--
-- Single-fire guarantee is UNCHANGED: reminder_sent_at is stamped in the same
-- statement that selects the row (for update skip locked), so a booking can never
-- be enqueued twice. The selection predicates are copied verbatim from the current
-- live body (20260826120000) — only the LIMIT and the dispatch mechanism change.
--
-- SECRETS: only booking_drain_ping() reads the vault (booking_notify_url /
-- booking_notify_secret), exactly like the existing functions. Until those exist
-- it no-ops, so this migration is safe to apply before secrets are registered.
--
-- Does NOT touch booking_notify_created / booking_notify_updated (created / cancel
-- / reschedule stay on their direct trigger → edge-function path) and does NOT
-- change the `booking-reminders` cron's name or schedule.

-- ── 1. pgmq extension + queue ────────────────────────────────────────────────
-- pgmq is a Supabase-supported extension; it installs into schema `pgmq`.
create extension if not exists pgmq;

-- pgmq.create(text) raises if the queue already exists, so guard it. We check for
-- the backing table pgmq.q_booking_notifications directly (works across pgmq
-- versions regardless of the list_queues() column name).
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pgmq'
      and c.relname = 'q_booking_notifications'
  ) then
    perform pgmq.create('booking_notifications');
  end if;
end $$;

-- ── 2. pgmq wrapper functions (public, security definer) ─────────────────────
-- The edge function calls these three via rpc; it never references `pgmq`.

-- Read up to p_qty messages, hiding them for p_vt seconds (visibility timeout).
-- pgmq.read returns (msg_id bigint, read_ct int, enqueued_at, vt, message jsonb).
create or replace function public.booking_queue_read(p_qty int, p_vt int)
returns table(msg_id bigint, read_ct int, message jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select r.msg_id, r.read_ct, r.message
    from pgmq.read('booking_notifications', p_vt, p_qty) r;
end;
$$;

-- Delete handled messages (array overload). No-op on empty/null input.
create or replace function public.booking_queue_delete(p_msg_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_msg_ids is null or array_length(p_msg_ids, 1) is null then
    return;
  end if;
  perform pgmq.delete('booking_notifications', p_msg_ids);
end;
$$;

-- Archive messages (moves them to pgmq.a_booking_notifications). No-op on
-- empty/null input.
create or replace function public.booking_queue_archive(p_msg_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_msg_ids is null or array_length(p_msg_ids, 1) is null then
    return;
  end if;
  perform pgmq.archive('booking_notifications', p_msg_ids);
end;
$$;

revoke all on function public.booking_queue_read(int, int) from public;
revoke all on function public.booking_queue_delete(bigint[]) from public;
revoke all on function public.booking_queue_archive(bigint[]) from public;
grant execute on function public.booking_queue_read(int, int) to service_role;
grant execute on function public.booking_queue_delete(bigint[]) to service_role;
grant execute on function public.booking_queue_archive(bigint[]) to service_role;

-- ── 3. booking_dispatch_reminders → enqueue instead of fan-out ───────────────
-- Same predicates + same single-fire guarantee as 20260826120000; the per-row
-- net.http_post loop is replaced by a data-modifying CTE that stamps
-- reminder_sent_at on the due rows and returns their ids, which we bulk-enqueue
-- with a single pgmq.send_batch call. No vault reads here (enqueue is DB-local).
-- LIMIT raised 200 → 5000.
--
-- NOTE on shape: the stamping CTE captures the picked ids into v_msgs via SELECT
-- INTO (a bare top-level `WITH … SELECT` inside plpgsql would raise 42601 "query
-- has no destination for result data"), then send_batch runs as the next
-- statement in the SAME transaction (the whole function is one tx). So if the
-- enqueue fails the stamp rolls back too — a reminder can never be marked sent
-- without being enqueued. Single-fire is still the stamp-in-the-selecting-
-- statement (for update skip locked), unchanged.
create or replace function public.booking_dispatch_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msgs jsonb[];
begin
  with picked as (
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
        limit 5000
     )
    returning b.id
  )
  select array_agg(
           jsonb_build_object(
             'booking_id', id,
             'event', 'reminder',
             'actor', 'system'
           )
         )
    into v_msgs
  from picked;

  -- array_agg over zero rows yields null ⇒ nothing due, nothing to enqueue.
  if v_msgs is not null then
    perform pgmq.send_batch('booking_notifications', v_msgs);
  end if;
end;
$$;

-- The existing `booking-reminders` cron (*/15) keeps calling this same function —
-- intentionally NOT re-scheduled or renamed here.

-- ── 4. Drain heartbeat: ping the edge function to drain the queue ────────────
-- Fires the edge function in {mode:'drain'} so the worker pulls a batch and sends.
-- Reads the vault exactly like the other functions; no-ops before secrets exist.
create or replace function public.booking_drain_ping()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'booking_notify_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'booking_notify_secret' limit 1;

  if v_url is null then
    return;  -- environment not configured yet: no-op
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-booking-notify-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('mode', 'drain')
  );
end;
$$;

-- (Re)schedule the drain cron idempotently — a NEW job, separate from
-- `booking-reminders`. Every minute so the queue never sits long.
select cron.unschedule('booking-notify-drain')
  where exists (select 1 from cron.job where jobname = 'booking-notify-drain');
select cron.schedule(
  'booking-notify-drain',
  '*/1 * * * *',
  $$select public.booking_drain_ping()$$
);
