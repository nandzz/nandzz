"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteAiJobSchema } from "../schemas";

export type DeleteAiJobResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Dismisses one of the owner's AI-edit jobs from the indicator. Owner-scoped by
// RLS + the explicit user_id filter.
export async function deleteAiJob(jobId: string): Promise<DeleteAiJobResult> {
  const parsed = deleteAiJobSchema.safeParse({ jobId });
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("ai_edit_jobs")
    .delete()
    .eq("id", parsed.data.jobId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "FAILED", message: error.message };
  return { ok: true };
}
