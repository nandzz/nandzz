import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileGallery } from "@/components/profile/ProfileGallery";
import { Button } from "@/components/ui/button";
import { getServerTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/layout/PageShell";
import { resolveGalleryLayout } from "@/lib/gallery/layouts";

const PAGE_SIZE = 24;

const fetchProfileByUsername = async (username: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  return data;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfileByUsername(username);

  if (!profile) {
    return {};
  }

  const name = profile.display_name || profile.username;

  return {
    title: `${name} (@${profile.username})`,
    alternates: {
      canonical: `https://nandzz.com/${profile.username}/gallery`,
    },
  };
}

export default async function ProfileGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;
  const { page } = await searchParams;

  const profile = await fetchProfileByUsername(username);
  if (!profile) {
    notFound();
  }
  // Respect the owner's public visibility flag for the gallery.
  if ((profile.show_gallery ?? true) === false) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [supabase, t] = await Promise.all([createClient(), getServerTranslations()]);

  const { data: images, count } = await supabase
    .from("spaces")
    .select("*", { count: "exact" })
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .eq("content_type", "image")
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  const displayName = profile.display_name || profile.username;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <PageShell width="wide">
        <div className="mb-8">
          <Link
            href={`/${profile.username}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {displayName}
          </Link>
        </div>

        <ProfileGallery
          images={images || []}
          totalCount={count ?? images?.length ?? 0}
          profile={profile}
          isOwner={isOwner}
          initialLayout={resolveGalleryLayout(profile)}
        />

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link href={`/${profile.username}/gallery?page=${currentPage - 1}`}>
                <Button variant="outline" size="sm" className="border-border/60">
                  {t.explore.previous}
                </Button>
              </Link>
            )}
            <span className="px-3 text-sm text-muted-foreground">
              {t.explore.pageOf.replace("{current}", String(currentPage)).replace("{total}", String(totalPages))}
            </span>
            {currentPage < totalPages && (
              <Link href={`/${profile.username}/gallery?page=${currentPage + 1}`}>
                <Button variant="outline" size="sm" className="border-border/60">
                  {t.explore.next}
                </Button>
              </Link>
            )}
          </div>
        )}
      </PageShell>
    </div>
  );
}
