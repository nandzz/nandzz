import type { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { ProfileGallery } from "@/components/profile/ProfileGallery";
import { ProfileBackground } from "@/components/profile/ProfileBackground";
import { resolveGalleryLayout } from "@/lib/gallery/layouts";
import { FEATURES } from "@/lib/flags";
import { getProfileWidgets } from "@/lib/widgets/server";
import type { WidgetInstanceWithCatalog } from "@/lib/types";
import { getServerTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/layout/PageShell";

const fetchProfileByUsername = async (username: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  return data;
};

// Per-username tag so a single profile can be invalidated with revalidateTag(`profile:${username}`)
const getProfile = cache((username: string) =>
  unstable_cache(
    () => fetchProfileByUsername(username),
    ["profile", username],
    { revalidate: 60, tags: [`profile:${username}`] }
  )()
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const [profile, t] = await Promise.all([getProfile(username), getServerTranslations()]);

  if (!profile) {
    return { title: t.meta.profileNotFoundTitle };
  }

  const name = profile.display_name || profile.username;

  const description = profile.tagline || t.meta.profileDescriptionFallback.replace("{name}", name);

  return {
    title: `${name} (@${profile.username})`,
    description,
    alternates: {
      canonical: `https://nandzz.com/${profile.username}`,
    },
    openGraph: {
      title: `${name} (@${profile.username})`,
      description,
      type: "profile",
      url: `https://nandzz.com/${profile.username}`,
      siteName: "Nandzz",
      ...(profile.avatar_url && {
        images: [{ url: profile.avatar_url, alt: t.meta.profileAvatarAlt.replace("{name}", name) }],
      }),
    },
    twitter: {
      card: "summary",
      title: `${name} (@${profile.username}) | Nandzz`,
      description,
      ...(profile.avatar_url && { images: [profile.avatar_url] }),
    },
  };
}

const PROFILE_PREVIEW_SIZE = 12;
// Profile shows at most 6 gallery images inline; the rest open in a paginated modal.
const GALLERY_PREVIEW_SIZE = 6;

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
    { data: spaces, count: totalSpaceCount },
    { data: galleryImages, count: totalGalleryCount },
    { data: { user } },
    widgets,
  ] = await Promise.all([
    // Contents carousel: every content type EXCEPT images (images live in the
    // gallery grid below). content_type is reliably backfilled, so .neq is safe.
    supabase
      .from("spaces")
      .select("*", { count: "exact" })
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .neq("content_type", "image")
      .order("created_at", { ascending: false })
      .range(0, PROFILE_PREVIEW_SIZE - 1),
    // Gallery: image-type spaces only.
    supabase
      .from("spaces")
      .select("*", { count: "exact" })
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .eq("content_type", "image")
      .order("created_at", { ascending: false })
      .range(0, GALLERY_PREVIEW_SIZE - 1),
    supabase.auth.getUser(),
    FEATURES.widgets
      ? getProfileWidgets(profile.id)
      : Promise.resolve([] as WidgetInstanceWithCatalog[]),
  ]);

  const t = await getServerTranslations();

  let likedSpaceIds: string[] = [];
  let savedSpaceIds: string[] = [];
  let isFollowing = false;

  if (user) {
    const allSpaceIds = [...(spaces ?? []), ...(galleryImages ?? [])].map(s => s.id);

    if (user.id !== profile.id) {
      const { data: followRow } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle();
      isFollowing = !!followRow;
    }

    if (allSpaceIds.length > 0) {
      const [{ data: likes }, { data: savedEntries }] = await Promise.all([
        supabase
          .from("space_likes")
          .select("space_id")
          .eq("user_id", user.id)
          .in("space_id", allSpaceIds),
        supabase
          .from("collection_spaces")
          .select("space_id, collections!inner(user_id)")
          .eq("collections.user_id", user.id)
          .in("space_id", allSpaceIds),
      ]);
      likedSpaceIds = likes?.map(l => l.space_id) || [];
      savedSpaceIds = [...new Set((savedEntries ?? []).map((e: { space_id: string }) => e.space_id))];
    }
  }

  const isOwner = user?.id === profile.id;
  const hasContents = (spaces?.length ?? 0) > 0;
  const hasGallery = (galleryImages?.length ?? 0) > 0;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <ProfileBackground
        backgroundUrl={profile.background_url ?? null}
        backgroundPosition={profile.background_position ?? null}
        isOwner={isOwner}
        profileId={profile.id}
        username={profile.username}
        displayName={profile.display_name || profile.username}
      />

      <PageShell width="wide">
        <ProfileHeader
          profile={profile}
          isOwner={isOwner}
          currentUserId={user?.id ?? null}
          isFollowing={isFollowing}
          widgets={widgets}
        />
        {hasGallery && (
          <div className="mt-12">
            <ProfileGallery
              images={galleryImages || []}
              totalCount={totalGalleryCount ?? galleryImages?.length ?? 0}
              profile={profile}
              isOwner={isOwner}
              initialLayout={resolveGalleryLayout(profile)}
              enableModal
            />
          </div>
        )}
        {hasContents && (
          <div className="mt-12">
            <ProfileContent
              spaces={spaces || []}
              totalCount={totalSpaceCount ?? spaces?.length ?? 0}
              profile={profile}
              likedSpaceIds={likedSpaceIds}
              savedSpaceIds={savedSpaceIds}
              currentUserId={user?.id}
            />
          </div>
        )}
        {!hasGallery && !hasContents && (
          <p className="mt-12 py-12 text-center text-muted-foreground">
            {t.profile.noPublicSpaces}
          </p>
        )}
      </PageShell>
    </div>
  );
}
