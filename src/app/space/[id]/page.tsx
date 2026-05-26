import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Old share links: /space/[id] → redirect to /{username}/space/[id]
export default async function SpaceRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("spaces")
    .select("profiles(username)")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const profile = data.profiles as unknown as { username: string } | null;
  if (!profile?.username) notFound();

  redirect(`/${profile.username}/space/${id}`);
}
