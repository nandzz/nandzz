"use server";

import { createClient } from "@/lib/supabase/server";
import type { AgentDocument } from "@/lib/types";
import { createAgentDocumentSchema, type CreateAgentDocumentInput } from "../schemas";

export type CreateAgentDocumentResult =
  | { ok: true; document: AgentDocument }
  | { ok: false; error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED"; message?: string };

// Insert a new knowledge document for the signed-in owner. Owner-scoped by RLS
// via the SSR server client. Folded in from `POST /api/agent/documents`.
// (`char_count` is a generated column — never written here.)
export async function createAgentDocument(
  input: CreateAgentDocumentInput
): Promise<CreateAgentDocumentResult> {
  const parsed = createAgentDocumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { data, error } = await supabase
    .from("agent_documents")
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single();

  if (error || !data) return { ok: false, error: "FAILED", message: error?.message };
  return { ok: true, document: data as AgentDocument };
}
