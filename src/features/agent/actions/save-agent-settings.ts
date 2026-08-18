"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveAgentSettingsSchema, type SaveAgentSettingsInput } from "../schemas";

const MAX_QUESTIONS = 6;
const MAX_QUESTION_CHARS = 120;

function sanitizeQuestions(input: string[]): string[] {
  return input
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .map((q) => q.slice(0, MAX_QUESTION_CHARS))
    .slice(0, MAX_QUESTIONS);
}

export type SaveAgentSettingsResult =
  | { ok: true; enabled: boolean; questions: string[] }
  | { ok: false; error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED"; message?: string };

// Save an owner's agent settings: the enable flag + the visitor suggested
// questions. Owner-scoped by RLS via the SSR server client. On success it busts
// the owner's public profile cache so enable/disable takes effect immediately.
// Folded in from `PATCH /api/agent/settings` (+ the follow-up profile revalidate
// the client used to fire separately).
export async function saveAgentSettings(
  input: SaveAgentSettingsInput
): Promise<SaveAgentSettingsResult> {
  const parsed = saveAgentSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const questions = sanitizeQuestions(parsed.data.agent_suggested_questions);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      agent_enabled: parsed.data.agent_enabled,
      agent_suggested_questions: questions,
    })
    .eq("id", user.id)
    .select("agent_enabled, agent_suggested_questions, username")
    .single();

  if (error || !data) return { ok: false, error: "FAILED", message: error?.message };

  // Invalidate the owner's own profile page (username comes from the persisted
  // row, so there's nothing client-supplied to authorize).
  if (data.username) {
    revalidateTag(`profile:${data.username}`, "max");
    revalidatePath(`/${data.username}`);
  }

  return {
    ok: true,
    enabled: !!data.agent_enabled,
    questions: (data.agent_suggested_questions as string[] | null) ?? [],
  };
}
