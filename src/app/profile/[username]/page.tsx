import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, tagline, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) {
    return { title: "Profile Not Found — Nandzz" };
  }

  const name = profile.display_name || profile.username;

  return {
    title: `${name} (@${profile.username}) — Nandzz`,
    description:
      profile.tagline || `Check out ${name}'s web apps on Nandzz.`,
    openGraph: {
      title: `${name} (@${profile.username})`,
      description:
        profile.tagline || `Check out ${name}'s web apps on Nandzz.`,
      ...(profile.avatar_url && {
        images: [{ url: profile.avatar_url }],
      }),
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: spaces } = await supabase
    .from("spaces")
    .select("*")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();
  let likedSpaceIds: string[] = [];
  if (user && spaces) {
    const spaceIds = spaces.map(s => s.id);
    const { data: likes } = await supabase
      .from("space_likes")
      .select("space_id")
      .eq("user_id", user.id)
      .in("space_id", spaceIds);
    likedSpaceIds = likes?.map(l => l.space_id) || [];
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-violet-100/40 blur-3xl dark:bg-violet-950/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ProfileHeader profile={profile} />
        <div className="mt-12">
          <ProfileTabs spaces={spaces || []} profile={profile} likedSpaceIds={likedSpaceIds} />
        </div>
      </div>
    </div>
  );
}
