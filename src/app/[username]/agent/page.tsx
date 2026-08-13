import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileWidgets } from "@/lib/widgets/server";
import { AgentPublic } from "@/components/agent/AgentPublic";
import { FEATURES } from "@/lib/flags";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  if (!FEATURES.agent) notFound();

  const { username } = await params;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public client agent shown on the profile page. The owner-facing studio
  // lives separately at /dashboard/agent.
  //
  // HARD GATE: the agent is a subscription-gated widget now — it only exists
  // for visitors while the owner has a live (enabled + entitled) `agent`
  // widget instance. getProfileWidgets already applies that exact filter.
  const widgets = await getProfileWidgets(profile.id);
  const agentWidget = widgets.find((w) => w.catalog.slug === "agent");
  if (!agentWidget) notFound();

  const { count } = await admin
    .from("agent_documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("visibility", "public")
    .eq("status", "active");

  return <AgentPublic profile={profile} hasDocuments={(count ?? 0) > 0} isAuthenticated={!!user} />;
}
