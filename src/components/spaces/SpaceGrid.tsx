"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SpaceCard } from "./SpaceCard";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LayoutGrid, Grid3X3, ChevronDown } from "lucide-react";
import type { SpaceWithProfile, Space, Tag } from "@/lib/types";

type FilterValue = "all" | `tag:${string}`;

interface SpaceGridProps {
  spaces: SpaceWithProfile[] | Space[];
  showAuthor?: boolean;
  showCreateCard?: boolean;
  editable?: boolean;
  likedSpaceIds?: string[];
  savedSpaceIds?: string[];
  collectionId?: string;
  currentUserId?: string;
  spaceTagsMap?: Record<string, Tag[]>;
  ownerUsername?: string;
}

export function SpaceGrid({
  spaces,
  showAuthor = false,
  showCreateCard = false,
  editable = false,
  likedSpaceIds = [],
  savedSpaceIds = [],
  collectionId,
  currentUserId,
  spaceTagsMap = {},
  ownerUsername,
}: SpaceGridProps) {
  const [compact, setCompact] = useState(false);
  const [filter, setFilter] = useState<FilterValue>("all");

  // Collect all unique tags present across the visible spaces
  const availableTags = useMemo(() => {
    const seen = new Map<string, Tag>();
    for (const space of spaces) {
      for (const tag of spaceTagsMap[space.id] ?? []) {
        if (!seen.has(tag.slug)) seen.set(tag.slug, tag);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [spaces, spaceTagsMap]);

  const filtered = useMemo(() => {
    if (filter === "all") return spaces;
    const slug = filter.slice(4);
    return spaces.filter((s) => (spaceTagsMap[s.id] ?? []).some((t) => t.slug === slug));
  }, [filter, spaces, spaceTagsMap]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        {/* View toggle */}
        <button
          onClick={() => setCompact((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={compact ? "Comfortable view" : "Compact view"}
        >
          {compact ? (
            <>
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Comfortable</span>
            </>
          ) : (
            <>
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Compact</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-border/60" />

        {/* Filter dropdown */}
        <div className="relative flex items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterValue)}
            className="appearance-none rounded-md border border-border/60 bg-background pl-2.5 pr-7 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 cursor-pointer"
          >
            <option value="all">All ({spaces.length})</option>
            {availableTags.map((tag) => {
              const count = spaces.filter((s) =>
                (spaceTagsMap[s.id] ?? []).some((t) => t.slug === tag.slug)
              ).length;
              return (
                <option key={tag.slug} value={`tag:${tag.slug}`}>
                  {tag.name} ({count})
                </option>
              );
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* Grid */}
      <div
        className={
          compact
            ? "grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6"
            : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {filtered.map((space) => {
          const profileUsername = "profiles" in space
            ? (space as SpaceWithProfile).profiles?.username
            : undefined;
          const displayUsername = showAuthor
            ? (
                "profiles" in space
                  ? (space as SpaceWithProfile).profiles?.display_name || profileUsername
                  : undefined
              )
            : undefined;
          const routeUsername = profileUsername || ownerUsername;
          return (
            <SpaceCard
              key={space.id}
              space={space}
              username={displayUsername || undefined}
              routeUsername={routeUsername || undefined}
              editable={editable}
              liked={likedSpaceIds.includes(space.id)}
              saved={savedSpaceIds.includes(space.id)}
              compact={compact}
              collectionId={collectionId}
              isOwn={!!currentUserId && space.user_id === currentUserId}
              tags={spaceTagsMap[space.id] ?? []}
            />
          );
        })}
        {showCreateCard && filter === "all" && (
          <Link href="/dashboard/create-space">
            <Card
              className={
                compact
                  ? "group flex aspect-square items-center justify-center border-dashed border-border/60 transition-all duration-300 hover:shadow-md hover:border-violet-400 dark:hover:border-violet-500/50"
                  : "group flex aspect-auto min-h-[280px] items-center justify-center border-dashed border-border/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-violet-400 dark:hover:border-violet-500/50"
              }
            >
              {compact ? (
                <div className="flex flex-col items-center gap-1 p-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100/80 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 group-hover:bg-violet-200/80 dark:group-hover:bg-violet-800/50 transition-colors">
                    <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-center text-muted-foreground">
                    New
                  </span>
                </div>
              ) : (
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100/80 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 group-hover:bg-violet-200/80 dark:group-hover:bg-violet-800/50 transition-colors">
                    <Plus className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="font-medium">Create New Space</span>
                  <span className="text-sm text-muted-foreground text-center">
                    Add a new web app to your collection
                  </span>
                </CardContent>
              )}
            </Card>
          </Link>
        )}
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground text-sm">
            No spaces match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
