import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SpaceGrid } from "@/components/spaces/SpaceGrid";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Layers, Plus, Rocket } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  const { data: spaces } = await supabase
    .from("spaces")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const greeting = profile?.display_name || profile?.username || "there";

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-violet-100/30 blur-3xl dark:bg-violet-950/15" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
                <LayoutGrid className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">My Spaces</h1>
            </div>
            <p className="mt-2 text-muted-foreground text-lg">
              Welcome back, {greeting}. Manage your web app collection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/collections">
              <Button variant="outline" className="border-border/60 gap-2">
                <Layers className="h-4 w-4" />
                Collections
              </Button>
            </Link>
            <Link href="/dashboard/create-space">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/25 transition-all hover:shadow-md hover:shadow-violet-600/30">
                <Plus className="h-4 w-4 mr-2" />
                Create Space
              </Button>
            </Link>
          </div>
        </div>

        {spaces && spaces.length > 0 ? (
          <SpaceGrid spaces={spaces} showCreateCard editable />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100/80 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800">
              <Rocket className="h-10 w-10 text-violet-400 dark:text-violet-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No spaces yet</h2>
            <p className="text-muted-foreground max-w-sm mb-6">
              Create your first Space to start building your web app collection.
            </p>
            <Link href="/dashboard/create-space">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/25">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Space
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
