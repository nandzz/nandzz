import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentDocument } from "@/lib/types";

// Server-only read: an owner's full knowledge base, ordered the same way the
// agent-chat edge function assembles context (sort_order, then created_at).
export async function getAgentDocuments(
  supabase: SupabaseClient,
  userId: string
): Promise<AgentDocument[]> {
  const { data, error } = await supabase
    .from("agent_documents")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AgentDocument[];
}

// Server-only read: how many public, active documents back a profile's agent.
// The public `/[username]/agent` page uses this to decide whether the agent is
// ready to answer (>0) or should show its "not ready yet" empty state.
export async function getPublicAgentDocCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("agent_documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("visibility", "public")
    .eq("status", "active");

  return count ?? 0;
}
