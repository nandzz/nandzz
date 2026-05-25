import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LikeButton } from "@/components/spaces/LikeButton";
import { ArrowLeft, ExternalLink } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("title, description, preview_image_url, profiles(display_name, username)")
    .eq("id", id)
    .single();

  if (!space) {
    return { title: "Space Not Found — Nandzz" };
  }

  const profile = space.profiles as unknown as {
    display_name: string | null;
    username: string | null;
  } | null;
  const author = profile?.display_name || profile?.username || "Unknown";

  return {
    title: `${space.title} — Nandzz`,
    description:
      space.description || `A web app shared by ${author} on Nandzz.`,
    openGraph: {
      title: space.title,
      description:
        space.description || `A web app shared by ${author} on Nandzz.`,
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
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("id", id)
    .single();

  if (!space) {
    notFound();
  }

  // Check if current user has liked this space
  const { data: { user } } = await supabase.auth.getUser();
  let liked = false;
  if (user) {
    const { data: likeData } = await supabase
      .from("space_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("space_id", id)
      .maybeSingle();
    liked = !!likeData;
  }

  // For HTML spaces, fetch the actual HTML content so we can use srcDoc
  // This avoids content-type issues with Supabase Storage serving as text/plain
  let htmlContent: string | null = null;
  if (space.type === "html" && space.html_url) {
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
      <div className="flex items-center justify-between border-b px-4 py-2.5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
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
          {space.type === "url" && space.url && (
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
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 bg-muted/50">
        {space.type === "html" && htmlContent ? (
          <iframe
            srcDoc={htmlContent}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-forms"
            title={space.title}
          />
        ) : space.type === "url" && space.url ? (
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
