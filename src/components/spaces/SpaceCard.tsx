"use client";

import React from "react";
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
import { ExternalLink, Globe, FileCode2, Pencil, Trash2 } from "lucide-react";
import { LikeButton } from "./LikeButton";
import type { Space, SpaceType } from "@/lib/types";

const typeLabels: Record<SpaceType, { label: string; icon: React.ReactNode }> = {
  url: { label: "Website", icon: <Globe className="size-2.5" /> },
  html: { label: "Custom Page", icon: <FileCode2 className="size-2.5" /> },
};

interface SpaceCardProps {
  space: Space;
  username?: string;
  editable?: boolean;
  liked?: boolean;
  compact?: boolean;
}

export function SpaceCard({ space, username, editable, liked, compact }: SpaceCardProps) {
  const router = useRouter();

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
        <div className="px-1.5 py-1">
          <p className="text-[10px] font-medium truncate text-foreground/80 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {space.title}
          </p>
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
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 dark:bg-violet-900/40 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 tracking-wide">
              {typeLabels[space.type].icon}
              {typeLabels[space.type].label}
            </span>
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
            {!editable && (
              <LikeButton
                spaceId={space.id}
                initialLikesCount={space.likes_count ?? 0}
                initialLiked={liked}
                size="sm"
              />
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>{cardContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => router.push(`/space/${space.id}`)}>
          <ExternalLink className="size-4" />
          Open
        </ContextMenuItem>
        {editable && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => router.push(`/dashboard/edit-space/${space.id}`)}
            >
              <Pencil className="size-4" />
              Edit
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
