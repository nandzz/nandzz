import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LikeButton } from "@/components/spaces/LikeButton";
import { ShareButton } from "@/components/spaces/ShareButton";
import { StarButton } from "@/components/spaces/StarButton";
import { ExternalLink } from "lucide-react";
import { HtmlSpaceEditor } from "@/components/spaces/HtmlSpaceEditor";
import { PdfViewerWrapper } from "@/components/spaces/PdfViewerWrapper";
import { BackButton } from "@/components/ui/BackButton";

// React cache deduplicates this call within a single request,
// so generateMetadata and SpaceViewPage share the same DB hit.
const getSpace = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("spaces")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("id", id)
    .single();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const space = await getSpace(id);

  if (!space) {
    return { title: "Space Not Found — nandzz" };
  }

  const profile = space.profiles as unknown as {
    display_name: string | null;
    username: string | null;
  } | null;
  const author = profile?.display_name || profile?.username || "Unknown";

  return {
    title: `${space.title} — nandzz`,
    description:
      space.description || `A web app shared by ${author} on nandzz.`,
    openGraph: {
      title: space.title,
      description:
        space.description || `A web app shared by ${author} on nandzz.`,
      ...(space.preview_image_url && {
        images: [{ url: space.preview_image_url }],
      }),
    },
  };
}

export default async function SpaceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getSpace is cached — reuses the same DB hit from generateMetadata
  const space = await getSpace(id);

  if (!space) {
    notFound();
  }

  const supabase = await createClient();

  // Check if current user has liked/saved this space
  const { data: { user } } = await supabase.auth.getUser();
  let liked = false;
  let saved = false;

  if (user) {
    const [{ data: likeData }, { data: starredCol }] = await Promise.all([
      supabase
        .from("space_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("space_id", id)
        .maybeSingle(),
      supabase
        .from("collections")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle(),
    ]);
    liked = !!likeData;

    if (starredCol) {
      const { data: savedEntry } = await supabase
        .from("collection_spaces")
        .select("id")
        .eq("collection_id", starredCol.id)
        .eq("space_id", id)
        .maybeSingle();
      saved = !!savedEntry;
    }
  }

  const isOwner = user?.id === space.user_id;

  // For HTML spaces, fetch the actual HTML content so we can use srcDoc
  // This avoids content-type issues with Supabase Storage serving as text/plain
  let htmlContent: string | null = null;
  if (space.html_url) {
    try {
      const res = await fetch(space.html_url);
      htmlContent = await res.text();
    } catch {
      // If fetch fails, we'll fall back to showing nothing
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 sm:px-6 lg:px-8 py-2.5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="h-4 w-px bg-border" />
          <h1 className="font-semibold truncate max-w-md">{space.title}</h1>
          {space.description && (
            <span className="hidden lg:inline text-sm text-muted-foreground truncate max-w-xs">
              — {space.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LikeButton
            spaceId={space.id}
            initialLikesCount={space.likes_count ?? 0}
            initialLiked={liked}
            size="md"
          />
          {!isOwner && (
            <StarButton spaceId={space.id} initialSaved={saved} size="md" />
          )}
          <ShareButton url={`/space/${space.id}`} title={space.title} size="md" />
          {space.profiles && (
            <Link
              href={`/profile/${space.profiles.username}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Avatar className="h-6 w-6 border border-border/50">
                <AvatarImage src={space.profiles.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                  {(
                    space.profiles.display_name || space.profiles.username
                  )?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">
                {space.profiles.display_name || space.profiles.username}
              </span>
            </Link>
          )}
          {space.url && !space.html_url && (
            <a href={space.url} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-border/60 hover:border-violet-500/50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Original</span>
              </Button>
            </a>
          )}
          {space.pdf_url && (
            <a href={space.pdf_url} target="_blank" rel="noopener noreferrer" download>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-border/60 hover:border-violet-500/50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Iframe / Editor */}
      <div className="flex-1 bg-muted/50">
        {htmlContent ? (
          isOwner ? (
            <HtmlSpaceEditor
              spaceId={space.id}
              htmlUrl={space.html_url!}
              initialHtml={htmlContent}
              spaceTitle={space.title}
            />
          ) : (
            <iframe
              srcDoc={htmlContent}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-forms"
              title={space.title}
            />
          )
        ) : space.pdf_url ? (
          <PdfViewerWrapper url={space.pdf_url} title={space.title} />
        ) : space.url ? (
          <iframe
            src={space.url}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={space.title}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No content available</p>
          </div>
        )}
      </div>
    </div>
  );
}
