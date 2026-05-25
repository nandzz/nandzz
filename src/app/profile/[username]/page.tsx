import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { ProfileBackground } from "@/components/profile/ProfileBackground";

// React cache deduplicates this call within a single request,
// so generateMetadata and ProfilePage share the same DB hit.
const getProfile = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return { title: "Profile Not Found — nandzz" };
  }

  const name = profile.display_name || profile.username;

  return {
    title: `${name} (@${profile.username}) — nandzz`,
    description:
      profile.tagline || `Check out ${name}'s web apps on nandzz.`,
    openGraph: {
      title: `${name} (@${profile.username})`,
      description:
        profile.tagline || `Check out ${name}'s web apps on nandzz.`,
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

  const profile = await getProfile(username);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();

  const [
    { data: spaces },
    { data: collections },
    { data: { user } },
  ] = await Promise.all([
    supabase
      .from("spaces")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("collections")
      .select("*, collection_spaces(space_id, spaces(*))")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  let likedSpaceIds: string[] = [];
  let savedSpaceIds: string[] = [];

  if (user && spaces) {
    const spaceIds = spaces.map(s => s.id);
    const [{ data: likes }, { data: starredCol }] = await Promise.all([
      supabase
        .from("space_likes")
        .select("space_id")
        .eq("user_id", user.id)
        .in("space_id", spaceIds),
      supabase
        .from("collections")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle(),
    ]);
    likedSpaceIds = likes?.map(l => l.space_id) || [];

    if (starredCol && spaceIds.length > 0) {
      const { data: savedEntries } = await supabase
        .from("collection_spaces")
        .select("space_id")
        .eq("collection_id", starredCol.id)
        .in("space_id", spaceIds);
      savedSpaceIds = savedEntries?.map(e => e.space_id) || [];
    }
  }

  const isOwner = user?.id === profile.id;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <ProfileBackground
        backgroundUrl={profile.background_url ?? null}
        backgroundPosition={profile.background_position ?? null}
        isOwner={isOwner}
        profileId={profile.id}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ProfileHeader profile={profile} />
        <div className="mt-12">
          <ProfileTabs
            spaces={spaces || []}
            collections={collections || []}
            profile={profile}
            likedSpaceIds={likedSpaceIds}
            savedSpaceIds={savedSpaceIds}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </div>
  );
}
