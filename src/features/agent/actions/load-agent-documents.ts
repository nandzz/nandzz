"use server";

import { createClient } from "@/lib/supabase/server";
import type { AgentDocument } from "@/lib/types";
import { getAgentDocuments } from "../data/documents";

export type LoadAgentDocumentsResult =
  | { ok: true; documents: AgentDocument[] }
  | { ok: false; error: "UNAUTHENTICATED" | "FAILED"; message?: string };

// Client-invoked read for AgentStudio, which mounts client-side and loads the
// signed-in owner's knowledge base. Folded in from `GET /api/agent/documents`.
export async function loadAgentDocuments(): Promise<LoadAgentDocumentsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  try {
    const documents = await getAgentDocuments(supabase, user.id);
    return { ok: true, documents };
  } catch (e) {
    return { ok: false, error: "FAILED", message: (e as Error).message };
  }
}
