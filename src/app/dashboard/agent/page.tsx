import { notFound, redirect } from "next/navigation";
import { createClient, getUserIdFromClaims } from "@/lib/supabase/server";
import { AgentStudio } from "@/features/agent";
import { FEATURES } from "@/lib/flags";

export default async function DashboardAgentPage() {
  if (!FEATURES.agent) notFound();

  const supabase = await createClient();
  const userId = await getUserIdFromClaims(supabase);

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) notFound();

  return <AgentStudio profile={profile} />;
}
