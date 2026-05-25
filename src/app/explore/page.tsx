import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SpaceGrid } from "@/components/spaces/SpaceGrid";
import { Button } from "@/components/ui/button";
import { Compass, Plus } from "lucide-react";

const PAGE_SIZE = 24;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  const { data: spaces, count } = await supabase
    .from("spaces")
    .select("*, profiles(username, display_name, avatar_url)", {
      count: "exact",
    })
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const { data: { user } } = await supabase.auth.getUser();
  let likedSpaceIds: string[] = [];
  let savedSpaceIds: string[] = [];

  let spaceTagsMap: Record<string, import("@/lib/types").Tag[]> = {};

  if (spaces && spaces.length > 0) {
    const spaceIds = spaces.map(s => s.id);

    const fetchTags = supabase
      .from("space_tags")
      .select("space_id, tags(*)")
      .in("space_id", spaceIds);

    const fetchLikes = user
      ? supabase.from("space_likes").select("space_id").eq("user_id", user.id).in("space_id", spaceIds)
      : Promise.resolve({ data: null });

    const fetchStarred = user
      ? supabase.from("collections").select("id").eq("user_id", user.id).eq("is_default", true).maybeSingle()
      : Promise.resolve({ data: null });

    const [tagsRes, likesRes, starredRes] = await Promise.all([fetchTags, fetchLikes, fetchStarred]);

    if (tagsRes.data) {
      for (const row of tagsRes.data) {
        const tag = row.tags as unknown as import("@/lib/types").Tag;
        if (!spaceTagsMap[row.space_id]) spaceTagsMap[row.space_id] = [];
        spaceTagsMap[row.space_id].push(tag);
      }
    }

    likedSpaceIds = likesRes.data?.map((l: { space_id: string }) => l.space_id) || [];

    if (starredRes.data) {
      const { data: savedEntries } = await supabase
        .from("collection_spaces")
        .select("space_id")
        .eq("collection_id", starredRes.data.id)
        .in("space_id", spaceIds);
      savedSpaceIds = savedEntries?.map((e: { space_id: string }) => e.space_id) || [];
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-violet-100/40 blur-3xl dark:bg-violet-950/20" />
        <div className="absolute left-0 bottom-0 h-[300px] w-[300px] rounded-full bg-fuchsia-100/30 blur-3xl dark:bg-fuchsia-950/15" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
              <Compass className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Explore Spaces
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground text-lg">
            Discover web apps shared by the community
          </p>
        </div>

        {spaces && spaces.length > 0 ? (
          <>
            <SpaceGrid spaces={spaces} showAuthor likedSpaceIds={likedSpaceIds} savedSpaceIds={savedSpaceIds} currentUserId={user?.id} spaceTagsMap={spaceTagsMap} />
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {currentPage > 1 && (
                  <Link href={`/explore?page=${currentPage - 1}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/60"
                    >
                      Previous
                    </Button>
                  </Link>
                )}
                <span className="px-3 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages && (
                  <Link href={`/explore?page=${currentPage + 1}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/60"
                    >
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100/80 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800">
              <Compass className="h-10 w-10 text-violet-400 dark:text-violet-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              No spaces yet
            </h2>
            <p className="text-muted-foreground max-w-sm mb-6">
              Be the first to share an AI-generated web app with the community.
            </p>
            <Link href="/login?tab=signup">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/25">
                <Plus className="h-4 w-4 mr-2" />
                Create the First Space
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
