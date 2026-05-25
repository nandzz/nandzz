"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { SpacePreview } from "./SpacePreview";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ExternalLink, Globe, FileCode2, FolderPlus, Pencil, Trash2, Bookmark } from "lucide-react";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";
import { StarButton } from "./StarButton";
import { AddToCollectionDialog } from "@/components/collections/AddToCollectionDialog";
import type { Space, SpaceType, Tag } from "@/lib/types";

const typeLabels: Record<SpaceType, { label: string; icon: React.ReactNode }> = {
  url: { label: "Website", icon: <Globe className="size-2.5" /> },
  html: { label: "Custom Page", icon: <FileCode2 className="size-2.5" /> },
};

interface SpaceCardProps {
  space: Space;
  username?: string;
  editable?: boolean;
  liked?: boolean;
  saved?: boolean;
  compact?: boolean;
  collectionId?: string;
  isOwn?: boolean;
  tags?: Tag[];
}

export function SpaceCard({ space, username, editable, liked, saved, compact, collectionId, isOwn, tags = [] }: SpaceCardProps) {
  const router = useRouter();
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(saved ?? false);

  const handleRemoveFromCollection = async () => {
    if (!collectionId) return;
    if (!confirm("Remove this space from the collection?")) return;
    const supabase = createClient();
    await supabase
      .from("collection_spaces")
      .delete()
      .eq("collection_id", collectionId)
      .eq("space_id", space.id);
    router.refresh();
  };

  const handleToggleStar = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    let { data: collection } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    if (!collection) {
      const { data: newCol } = await supabase
        .from("collections")
        .insert({ user_id: user.id, name: "Starred", description: "Spaces I've saved from the community", is_public: true, is_default: true })
        .select("id")
        .single();
      collection = newCol;
    }

    if (!collection) return;

    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    if (wasSaved) {
      await supabase.from("collection_spaces").delete().eq("collection_id", collection.id).eq("space_id", space.id);
    } else {
      await supabase.from("collection_spaces").insert({ collection_id: collection.id, space_id: space.id });
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this space?")) return;
    const supabase = createClient();
    await supabase.from("spaces").delete().eq("id", space.id);
    router.refresh();
  };

  const cardContent = compact ? (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-violet-500/10 border-border/60 dark:border-border/80 dark:hover:border-violet-500/20 p-0">
      <Link href={`/space/${space.id}`} className="block">
        <div className="aspect-square bg-muted relative overflow-hidden">
          <SpacePreview space={space} />
          {/* Hover gradient overlay with title */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-1.5">
            <span className="text-[10px] font-medium text-white leading-tight line-clamp-2">
              {space.title}
            </span>
          </div>
        </div>
        <div className="px-2 pt-1.5 pb-2.5 h-[52px]">
          <p className="text-[10px] font-medium truncate text-foreground/80 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {space.title}
          </p>
          {space.description && (
            <p className="text-[9px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
              {space.description}
            </p>
          )}
        </div>
      </Link>
    </Card>
  ) : (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 border-border/60 dark:border-border/80 dark:hover:border-violet-500/20 p-0">
      <Link href={`/space/${space.id}`} className="block">
        <div className="aspect-video bg-muted relative overflow-hidden">
          <SpacePreview space={space} />
          {/* Hover gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <CardContent className="p-4 flex flex-col">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 dark:bg-violet-900/40 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 tracking-wide">
              {typeLabels[space.type].icon}
              {typeLabels[space.type].label}
            </span>
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <h3 className="text-lg font-bold truncate mt-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {space.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 h-10">
            {space.description ?? ""}
          </p>
          <div className="mt-3 flex items-center justify-between">
            {username ? (
              <p className="text-xs text-muted-foreground">by {username}</p>
            ) : (
              <span />
            )}
            <div
              className="flex items-center gap-1"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {!editable && !isOwn && (
                <>
                  <LikeButton
                    spaceId={space.id}
                    initialLikesCount={space.likes_count ?? 0}
                    initialLiked={liked}
                    size="sm"
                  />
                  <StarButton spaceId={space.id} initialSaved={isSaved} size="sm" onToggle={setIsSaved} />
                </>
              )}
              <ShareButton url={`/space/${space.id}`} title={space.title} size="sm" />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{cardContent}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => router.push(`/space/${space.id}`)}>
            <ExternalLink className="size-4" />
            Open
          </ContextMenuItem>
          {!editable && !isOwn && (
            <ContextMenuItem onClick={handleToggleStar}>
              <Bookmark className={`size-4 ${isSaved ? "fill-violet-500 text-violet-500" : ""}`} />
              {isSaved ? "Remove from Starred" : "Save to Starred"}
            </ContextMenuItem>
          )}
          {editable && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => setCollectionDialogOpen(true)}>
                <FolderPlus className="size-4" />
                Add to Collection
              </ContextMenuItem>
              {collectionId && (
                <ContextMenuItem variant="destructive" onClick={handleRemoveFromCollection}>
                  <Trash2 className="size-4" />
                  Remove from Collection
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => router.push(`/dashboard/edit-space/${space.id}`)}
              >
                <Pencil className="size-4" />
                Edit
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4" />
                Delete Space
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <AddToCollectionDialog
        open={collectionDialogOpen}
        onClose={() => setCollectionDialogOpen(false)}
        spaceId={space.id}
        spaceTitle={space.title}
      />
    </>
  );
}
