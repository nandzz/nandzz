import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SpaceGrid } from "@/components/spaces/SpaceGrid";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, Pencil } from "lucide-react";
import { CollectionActions } from "./CollectionActions";
import type { Space } from "@/lib/types";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!collection) {
    notFound();
  }

  const [{ data: collectionSpaces }, { data: profile }] = await Promise.all([
    supabase
      .from("collection_spaces")
      .select("space_id, spaces(*)")
      .eq("collection_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single(),
  ]);

  const spaces: Space[] = (collectionSpaces || [])
    .map((cs) => cs.spaces as unknown as Space)
    .filter(Boolean);

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-violet-100/30 blur-3xl dark:bg-violet-950/15" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/dashboard/collections"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Collections
        </Link>

        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
                <FolderOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
            </div>
            {collection.description && (
              <p className="mt-2 text-muted-foreground text-lg">{collection.description}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {spaces.length} {spaces.length === 1 ? "space" : "spaces"} ·{" "}
              {collection.is_public ? "Public" : "Private"}
            </p>
          </div>
          <CollectionActions collection={collection} />
        </div>

        {spaces.length > 0 ? (
          <SpaceGrid spaces={spaces} editable collectionId={id} ownerUsername={profile?.username || undefined} />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/60 rounded-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100/80 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800">
              <FolderOpen className="h-8 w-8 text-violet-400 dark:text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No spaces yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Go to{" "}
              <Link href="/dashboard" className="text-violet-600 hover:underline">
                My Spaces
              </Link>{" "}
              and right-click any space to add it to this collection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
