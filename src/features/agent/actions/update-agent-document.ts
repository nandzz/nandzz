"use server";

import { createClient } from "@/lib/supabase/server";
import type { AgentDocument } from "@/lib/types";
import { updateAgentDocumentSchema, type UpdateAgentDocumentInput } from "../schemas";

export type UpdateAgentDocumentResult =
  | { ok: true; document: AgentDocument }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOTHING_TO_UPDATE" | "FAILED";
      message?: string;
    };

// Patch an owner's knowledge document. Only the fields actually supplied are
// written, so the AI advisor's `{ title, content }` update preserves the row's
// existing visibility / status / is_sensitive / sort_order. `updated_at` is set
// by the DB trigger. Owner-scoped by RLS + the explicit user_id filter. Folded
// in from `PUT /api/agent/documents/[id]`.
export async function updateAgentDocument(
  input: UpdateAgentDocumentInput
): Promise<UpdateAgentDocumentResult> {
  const parsed = updateAgentDocumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { id, ...fields } = parsed.data;

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) update[key] = value;
  }
  if (Object.keys(update).length === 0) {
    return { ok: false, error: "NOTHING_TO_UPDATE" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { data, error } = await supabase
    .from("agent_documents")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) return { ok: false, error: "FAILED", message: error?.message };
  return { ok: true, document: data as AgentDocument };
}
