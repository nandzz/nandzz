import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SpaceGrid } from "@/components/spaces/SpaceGrid";
import { ArrowRight } from "lucide-react";

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
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Text */}
            <div>
              <div className="mb-8 flex items-center gap-3">
                <span className="h-px w-8 bg-violet-500 flex-shrink-0" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  AI Gallery · Community
                </span>
              </div>

              <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-bold tracking-tight leading-[1.04]">
                Share what
                <br />
                <span className="text-violet-600">AI built.</span>
              </h1>

              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-sm">
                A gallery for apps made with Claude, ChatGPT & friends.
                Upload HTML or drop a URL.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/login?tab=signup">
                  <Button
                    size="lg"
                    className="bg-violet-600 hover:bg-violet-700 text-white px-8 shadow-lg shadow-violet-600/25 hover:shadow-xl hover:shadow-violet-600/30 transition-all"
                  >
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Browse the gallery
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Browser mockup placeholder — swap this div for a real <Image> when ready */}
            <div className="relative lg:ml-8">
              <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-800/25 pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-fuchsia-200/40 blur-2xl dark:bg-fuchsia-800/20 pointer-events-none" />

              <div className="relative rounded-2xl border border-border/50 shadow-2xl shadow-black/10 overflow-hidden bg-card">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 bg-muted/60 px-4 py-2.5 border-b border-border/40">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                  <div className="ml-3 flex-1 bg-background rounded-md h-5 flex items-center px-3 border border-border/30">
                    <span className="text-[11px] text-muted-foreground/50 font-mono">
                      nandzz.com/explore
                    </span>
                  </div>
                </div>

                {/* Gallery preview — placeholder grid, replace with <Image src="/hero-preview.png"> */}
                <div className="p-4 grid grid-cols-2 gap-2.5 bg-background/50">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-800/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-violet-400/70">space #1</span>
                  </div>
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-800/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-sky-400/70">space #2</span>
                  </div>
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-emerald-400/70">space #3</span>
                  </div>
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-amber-400/70">space #4</span>
                  </div>
                </div>

                {/* Bottom bar of the browser mockup */}
                <div className="px-4 py-3 border-t border-border/30 bg-muted/30 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground/50 font-mono">
                    {spaces?.length ?? 0}+ spaces shared
                  </span>
                  <span className="text-[11px] text-violet-500 font-mono">
                    explore →
                  </span>
                </div>
              </div>
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
