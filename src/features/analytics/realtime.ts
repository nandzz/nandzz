import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

// Client-side realtime + list-read helpers for the notification bell and the
// AI-jobs indicator. Realtime subscriptions fundamentally require the browser
// Supabase client, and these mount-time list reads are paired with them (the
// component seeds its list, then merges live changes) — so, like
// `features/spaces/realtime.ts`, they live OUTSIDE `components/` to satisfy the
// `no-restricted-imports` guardrail. Components consume them through thin
// callbacks and never touch `@/lib/supabase/*` themselves. The corresponding
// MUTATIONS (mark-read, delete-job) go through zod-validated Server Actions.

// ── Notifications ────────────────────────────────────────────────────────────

/** The 20 most recent notifications for a user, newest first. */
export async function fetchNotifications(
  userId: string
): Promise<Notification[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as Notification[]) ?? [];
}

/**
 * Subscribes to new-notification INSERTs for a user. RLS scopes delivery to the
 * owner. `channelSuffix` keeps multiple mounted instances (Navbar + Sidebar)
 * from colliding on the same realtime topic. Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  userId: string,
  channelSuffix: string,
  handlers: { onInsert: (notification: Notification) => void }
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`notifications:${userId}:${channelSuffix}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => handlers.onInsert(payload.new as Notification)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── AI-edit jobs ─────────────────────────────────────────────────────────────

export type AiJobRow = {
  id: string;
  space_id: string;
  instruction: string;
  status: "pending" | "processing" | "done" | "error";
  status_text: string | null;
  created_at: string;
  spaces?: { title: string; profiles?: { username: string } } | null;
};

/** The 10 most recent AI-edit jobs for a user, newest first, with space info. */
export async function fetchAiJobs(userId: string): Promise<AiJobRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_edit_jobs")
    .select(
      "id, space_id, instruction, status, status_text, created_at, spaces(title, profiles(username))"
    )
    .eq("user_id", userId)
    .in("status", ["pending", "processing", "done", "error"])
    .order("created_at", { ascending: false })
    .limit(10);
  return (data as unknown as AiJobRow[]) ?? [];
}

/**
 * Subscribes to any change on a user's AI-edit jobs (INSERT/UPDATE/DELETE),
 * invoking `onChange` so the indicator can re-read the list. `channelSuffix`
 * keeps multiple mounted instances from colliding on the same realtime topic.
 * Returns an unsubscribe function.
 */
export function subscribeToAiJobs(
  userId: string,
  channelSuffix: string,
  handlers: { onChange: () => void }
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`ai-jobs-indicator-${userId}-${channelSuffix}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ai_edit_jobs",
        filter: `user_id=eq.${userId}`,
      },
      () => handlers.onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
