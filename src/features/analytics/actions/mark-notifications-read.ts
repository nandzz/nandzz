"use server";

import { createClient } from "@/lib/supabase/server";
import { markNotificationsReadSchema } from "../schemas";

export type MarkNotificationsReadResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Marks a batch of the signed-in user's notifications as read (the bell stamps
// `read_at` when its dropdown opens). Owner-scoped by RLS + the explicit
// user_id filter.
export async function markNotificationsRead(
  ids: string[]
): Promise<MarkNotificationsReadResult> {
  const parsed = markNotificationsReadSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", parsed.data.ids)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "FAILED", message: error.message };
  return { ok: true };
}
