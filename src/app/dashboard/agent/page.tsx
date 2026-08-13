import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentStudio } from "@/components/agent/AgentStudio";
import { FEATURES } from "@/lib/flags";

export default async function DashboardAgentPage() {
  if (!FEATURES.agent) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) notFound();

  return <AgentStudio profile={profile} />;
}
