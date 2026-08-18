"use server";

import { createClient } from "@/lib/supabase/server";
import { aiEditJobIdSchema } from "../schemas";

export type ResolveAiEditJobResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Deletes an AI-edit job row once its result has been applied or dismissed
// (approve / dismiss / dismiss-failed in the HTML editor). RLS restricts the
// delete to jobs the caller owns.
export async function resolveAiEditJob(
  input: { jobId: string }
): Promise<ResolveAiEditJobResult> {
  const parsed = aiEditJobIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("ai_edit_jobs")
    .delete()
    .eq("id", parsed.data.jobId);
  if (error) return { ok: false, error: "FAILED", message: error.message };

  return { ok: true };
}
