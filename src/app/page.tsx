import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SpaceGrid } from "@/components/spaces/SpaceGrid";
import { ArrowRight, Sparkles, Globe, Code } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: spaces } = await supabase
    .from("spaces")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: { user } } = await supabase.auth.getUser();
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

    if (starredCol) {
      const { data: savedEntries } = await supabase
        .from("collection_spaces")
        .select("space_id")
        .eq("collection_id", starredCol.id)
        .in("space_id", spaceIds);
      savedSpaceIds = savedEntries?.map(e => e.space_id) || [];
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-200/60 blur-3xl dark:bg-violet-900/30 animate-hero-gradient" />
          <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-fuchsia-200/40 blur-3xl dark:bg-fuchsia-900/20 animate-hero-gradient-2" />
          <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-900/15 animate-hero-gradient" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.7_0_0_/_0.05)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.7_0_0_/_0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,oklch(0.5_0_0_/_0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0_/_0.06)_1px,transparent_1px)]" />

        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span>The home for AI-generated web apps</span>
            </div>
            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl">
              Save & Share
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                {" "}
                AI-Built Web Apps
              </span>
            </h1>
            <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto text-balance">
              Built something cool with Claude or ChatGPT? nandzz lets you
              save, host, and share AI-generated web apps with the world.
              Upload HTML or link a URL — it&apos;s that simple.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login?tab=signup">
                <Button
                  size="lg"
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 shadow-lg shadow-violet-600/25 hover:shadow-xl hover:shadow-violet-600/30 transition-all"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 border-border/60 hover:border-violet-500/50 transition-colors"
                >
                  Explore Spaces
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border bg-card/80 backdrop-blur-sm px-5 py-3 shadow-sm transition-colors hover:border-violet-500/30">
              <Code className="h-5 w-5 text-violet-500" />
              <span className="text-sm font-medium">Upload HTML</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-card/80 backdrop-blur-sm px-5 py-3 shadow-sm transition-colors hover:border-violet-500/30">
              <Globe className="h-5 w-5 text-violet-500" />
              <span className="text-sm font-medium">Link a URL</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-card/80 backdrop-blur-sm px-5 py-3 shadow-sm transition-colors hover:border-violet-500/30">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <span className="text-sm font-medium">Share Instantly</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Spaces */}
      {spaces && spaces.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Recent Spaces
              </h2>
              <p className="mt-1 text-muted-foreground">
                Discover what the community is sharing
              </p>
            </div>
            <Link href="/explore">
              <Button
                variant="ghost"
                className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/50"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <SpaceGrid spaces={spaces} showAuthor likedSpaceIds={likedSpaceIds} savedSpaceIds={savedSpaceIds} currentUserId={user?.id} />
        </section>
      )}

      {/* CTA Banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 dark:from-violet-800 dark:via-violet-900 dark:to-fuchsia-900" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0_/_0.05)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0_/_0.05)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Create your own Space
              </h2>
              <p className="mt-3 text-violet-100/90 text-lg">
                Start curating and sharing your favorite web apps today.
              </p>
            </div>
            <Link href="/login?tab=signup">
              <Button
                size="lg"
                className="bg-white text-violet-700 hover:bg-violet-50 whitespace-nowrap px-8 shadow-lg shadow-black/10 font-semibold"
              >
                Create Space
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
