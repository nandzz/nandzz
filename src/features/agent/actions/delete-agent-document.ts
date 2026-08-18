"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteAgentDocumentSchema } from "../schemas";

export type DeleteAgentDocumentResult =
  | { ok: true }
  | { ok: false; error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED"; message?: string };

// Delete an owner's knowledge document. Owner-scoped by RLS + the explicit
// user_id filter. Folded in from `DELETE /api/agent/documents/[id]`.
export async function deleteAgentDocument(
  id: string
): Promise<DeleteAgentDocumentResult> {
  const parsed = deleteAgentDocumentSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("agent_documents")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "FAILED", message: error.message };
  return { ok: true };
}
