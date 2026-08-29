// Batched "drain" mode for booking-notifications.
//
// A `*/1` cron heartbeat POSTs `{ "mode": "drain" }`; this drains a pgmq queue of
// reminder jobs, replacing the old one-HTTP-call-per-booking cron. Per invocation:
// templates are loaded ONCE, each batch loads all its bookings + instances in one
// query apiece, owner-email auth fallbacks are deduped, and the batch's emails are
// sent with a bounded concurrency cap. The loop reads → processes → book-keeps the
// queue until it's empty or a wall-clock budget is hit.
//
// Queue bookkeeping per message: it "succeeds" (⇒ delete) when all its intended
// emails were sent OR legitimately skipped (no email, redundant reminder, not
// confirmed, SES unconfigured, booking gone). It "fails" only on a hard SES send
// error; a failed message is archived (dead-lettered) once it has been read
// MAX_READS times, otherwise left to reappear after the visibility timeout.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { loadTemplates } from "./config.ts";
import { readSesConfig, sendSesEmail, type SesConfig } from "./ses.ts";
import {
  buildEmailJobs,
  type EmailJob,
  type OwnerProfile,
} from "./render.ts";
import {
  reminderIsRedundant,
  type BookingRow,
  type NotifyActor,
  type NotifyEvent,
} from "./types.ts";

// Tunables (named consts per the spec).
export const DRAIN_READ_QTY = 100; // messages requested per booking_queue_read
export const DRAIN_VT = 60; // visibility timeout (s) applied to read messages
export const SEND_CONCURRENCY = 25; // max emails in flight per batch
export const MAX_READS = 5; // reads before a failing message is dead-lettered
export const BUDGET_MS = 50_000; // wall-clock budget for the whole drain loop

const LOG = "[booking-notifications:drain]";

// widget_instances select shared with the single path so both load identical
// columns. `id` is included so batched `.in(...)` results can be mapped back.
// NOTE: `profiles` has no `email` column (email lives in auth.users) — including
// it here 400s the whole embed, nulling `owner` and forcing every fallback
// ("your provider", lettered avatar, default timezone). The business email is
// resolved from auth.users downstream, so it's correctly absent here.
export const INSTANCE_SELECT =
  "id, config, owner:profiles(display_name, username, locale, logo_url, avatar_url, brand_colors)";

// A row returned by booking_queue_read (pgmq read). `message` is the queued JSON.
export type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: { booking_id?: unknown; event?: unknown; actor?: unknown };
};

type InstanceRow = {
  id: string;
  config?: Record<string, unknown> | null;
  owner?: OwnerProfile | null;
};

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

// Run `fn` over `items` with at most `limit` in flight at once, returning results
// in input order. The pool never exceeds `limit` concurrent calls.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length;
  const results = new Array<R>(n);
  if (n === 0) return results;
  const cap = Math.max(1, Math.min(limit, n));
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= n) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: cap }, () => worker()));
  return results;
}

// Split per-message outcomes into queue actions: ok ⇒ delete; not-ok with the
// read count at/over the dead-letter threshold ⇒ archive; not-ok under it ⇒
// neither (left to reappear after the visibility timeout).
export function partitionQueueOutcomes(
  results: Array<{ msg_id: number; read_ct: number; ok: boolean }>,
  maxReads: number,
): { deleteIds: number[]; archiveIds: number[] } {
  const deleteIds: number[] = [];
  const archiveIds: number[] = [];
  for (const r of results) {
    if (r.ok) deleteIds.push(r.msg_id);
    else if (r.read_ct >= maxReads) archiveIds.push(r.msg_id);
  }
  return { deleteIds, archiveIds };
}

// Distinct booking ids referenced by a batch of queue messages, in first-seen
// order. Non-string / blank booking_ids are dropped.
export function collectBookingIds(messages: QueueMessage[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of messages) {
    const id = m.message?.booking_id;
    if (typeof id === "string" && id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

// ── Batch processing ──────────────────────────────────────────────────────────

type BatchResult = {
  sent: number;
  skipped: number;
  deleteIds: number[];
  archiveIds: number[];
};

// A message's plan: the emails to attempt plus a count of legitimately skipped /
// no-op recipients (used only for the reported `skipped` counter).
type MessagePlan = {
  msg_id: number;
  read_ct: number;
  jobs: EmailJob[];
  skips: number;
};

async function planMessages(
  admin: SupabaseClient,
  messages: QueueMessage[],
  templates: Awaited<ReturnType<typeof loadTemplates>>,
  siteUrl: string,
): Promise<MessagePlan[]> {
  // Batch-load all bookings in one query.
  const bookingIds = collectBookingIds(messages);
  const bookingMap = new Map<string, BookingRow>();
  if (bookingIds.length) {
    const { data, error } = await admin.from("widget_bookings").select("*").in("id", bookingIds);
    if (error) console.error(`${LOG} booking batch load error:`, error.message);
    for (const b of (data ?? []) as BookingRow[]) bookingMap.set(b.id, b);
  }

  // Batch-load all needed instances (config + owner join) in one query.
  const instanceIds = [
    ...new Set(
      [...bookingMap.values()].map((b) => b.instance_id).filter((v): v is string => !!v),
    ),
  ];
  const instanceMap = new Map<string, InstanceRow>();
  if (instanceIds.length) {
    const { data, error } = await admin
      .from("widget_instances")
      .select(INSTANCE_SELECT)
      .in("id", instanceIds);
    if (error) console.error(`${LOG} instance batch load error:`, error.message);
    for (const inst of (data ?? []) as InstanceRow[]) instanceMap.set(inst.id, inst);
  }

  // Resolve business emails, falling back to auth.users only for owners missing a
  // profile email — deduped per owner_user_id so we never look one up twice.
  const authEmailCache = new Map<string, string>();
  async function resolveBusinessEmail(booking: BookingRow, owner: OwnerProfile | null) {
    const profileEmail = owner?.email?.trim() || "";
    if (profileEmail) return profileEmail;
    const ownerId = booking.owner_user_id;
    if (!ownerId) return "";
    if (authEmailCache.has(ownerId)) return authEmailCache.get(ownerId)!;
    let email = "";
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(ownerId);
      email = authUser?.user?.email?.trim() || "";
    } catch (err) {
      console.error(`${LOG} auth email lookup failed:`, err instanceof Error ? err.message : err);
    }
    authEmailCache.set(ownerId, email);
    return email;
  }

  const plans: MessagePlan[] = [];
  for (const m of messages) {
    const bookingId = typeof m.message?.booking_id === "string" ? m.message.booking_id : "";
    const booking = bookingId ? bookingMap.get(bookingId) : undefined;

    // Booking gone (e.g. deleted after enqueue) → nothing to do; succeed + delete.
    if (!booking) {
      plans.push({ msg_id: m.msg_id, read_ct: m.read_ct, jobs: [], skips: 1 });
      continue;
    }

    const event = (typeof m.message?.event === "string" ? m.message.event : "reminder") as NotifyEvent;
    const actor = (typeof m.message?.actor === "string" ? m.message.actor : "system") as NotifyActor;

    // Reminder guards (same rule the cron applies in SQL) — skip, but succeed.
    if (event === "reminder") {
      if (booking.status !== "confirmed") {
        plans.push({ msg_id: m.msg_id, read_ct: m.read_ct, jobs: [], skips: 1 });
        continue;
      }
      if (reminderIsRedundant(booking.created_at, booking.starts_at)) {
        plans.push({ msg_id: m.msg_id, read_ct: m.read_ct, jobs: [], skips: 1 });
        continue;
      }
    }

    const instance = instanceMap.get(booking.instance_id) ?? null;
    const owner = (instance?.owner ?? null) as OwnerProfile | null;
    const config = (instance?.config ?? {}) as Record<string, unknown>;
    const businessEmail = await resolveBusinessEmail(booking, owner);

    const { jobs, skipped } = buildEmailJobs({
      booking,
      owner,
      config,
      businessEmail,
      templates,
      event,
      actor,
      siteUrl,
    });
    plans.push({ msg_id: m.msg_id, read_ct: m.read_ct, jobs, skips: skipped.length });
  }
  return plans;
}

async function processBatch(
  admin: SupabaseClient,
  messages: QueueMessage[],
  templates: Awaited<ReturnType<typeof loadTemplates>>,
  ses: SesConfig | null,
  siteUrl: string,
): Promise<BatchResult> {
  const plans = await planMessages(admin, messages, templates, siteUrl);

  // SES unconfigured: every intended email is a legitimate skip; all messages
  // succeed and are deleted (matches the single path's graceful no-op).
  if (!ses) {
    let skipped = 0;
    for (const p of plans) skipped += p.skips + p.jobs.length;
    return { sent: 0, skipped, deleteIds: plans.map((p) => p.msg_id), archiveIds: [] };
  }

  // Flatten every job across the batch and send with a bounded concurrency cap.
  const sendables = plans.flatMap((p) => p.jobs.map((job) => ({ msgId: p.msg_id, job })));
  const outcomes = await mapWithConcurrency(sendables, SEND_CONCURRENCY, async ({ msgId, job }) => {
    try {
      const messageId = await sendSesEmail(ses, { to: job.to, subject: job.subject, html: job.html });
      console.info(`${LOG} sent ${job.id} → ${job.to} (SES MessageId: ${messageId})`);
      return { msgId, ok: true };
    } catch (err) {
      console.error(`${LOG} send failed for ${job.id}:`, err instanceof Error ? err.message : err);
      return { msgId, ok: false };
    }
  });

  const sent = outcomes.filter((o) => o.ok).length;
  const failedMsgIds = new Set(outcomes.filter((o) => !o.ok).map((o) => o.msgId));

  const results = plans.map((p) => ({
    msg_id: p.msg_id,
    read_ct: p.read_ct,
    ok: !failedMsgIds.has(p.msg_id),
  }));
  const { deleteIds, archiveIds } = partitionQueueOutcomes(results, MAX_READS);

  const skipped = plans.reduce((acc, p) => acc + p.skips, 0);
  return { sent, skipped, deleteIds, archiveIds };
}

// ── Drain loop ────────────────────────────────────────────────────────────────

export type DrainResult = {
  ok: true;
  drained: number;
  sent: number;
  skipped: number;
  archived: number;
};

// Repeatedly read + process the queue until it's empty or the time budget is hit.
// Templates + SES config are read once up front and reused across all batches.
export async function runDrain(admin: SupabaseClient, siteUrl: string): Promise<DrainResult> {
  const started = Date.now();
  let drained = 0;
  let sent = 0;
  let skipped = 0;
  let archived = 0;

  const templates = await loadTemplates(admin); // ONCE per invocation, not per email
  if (!templates) {
    console.error(`${LOG} app_settings 'booking_email_template' missing/invalid — using bare fallback`);
  }
  const ses = readSesConfig();
  if (!ses) console.info(`${LOG} SES not configured — draining as skips`);

  while (Date.now() - started < BUDGET_MS) {
    const { data, error } = await admin.rpc("booking_queue_read", {
      p_qty: DRAIN_READ_QTY,
      p_vt: DRAIN_VT,
    });
    if (error) {
      console.error(`${LOG} booking_queue_read failed:`, error.message);
      break;
    }
    const messages = (data ?? []) as QueueMessage[];
    if (messages.length === 0) break; // queue drained

    const batch = await processBatch(admin, messages, templates, ses, siteUrl);
    drained += messages.length;
    sent += batch.sent;
    skipped += batch.skipped;
    archived += batch.archiveIds.length;

    if (batch.deleteIds.length) {
      const { error: delErr } = await admin.rpc("booking_queue_delete", { p_msg_ids: batch.deleteIds });
      if (delErr) console.error(`${LOG} booking_queue_delete failed:`, delErr.message);
    }
    if (batch.archiveIds.length) {
      const { error: arcErr } = await admin.rpc("booking_queue_archive", { p_msg_ids: batch.archiveIds });
      if (arcErr) console.error(`${LOG} booking_queue_archive failed:`, arcErr.message);
    }
  }

  return { ok: true, drained, sent, skipped, archived };
}
