"use client";

import { useState } from "react";
import Link from "next/link";
import { SpaceCard } from "./SpaceCard";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LayoutGrid, Grid3X3, Globe, FileCode2 } from "lucide-react";
import type { SpaceWithProfile, Space, SpaceType } from "@/lib/types";

type FilterType = "all" | SpaceType;

const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
  { value: "url", label: "Website", icon: <Globe className="h-3 w-3" /> },
  { value: "html", label: "Custom Page", icon: <FileCode2 className="h-3 w-3" /> },
];

interface SpaceGridProps {
  spaces: SpaceWithProfile[] | Space[];
  showAuthor?: boolean;
  showCreateCard?: boolean;
  editable?: boolean;
  likedSpaceIds?: string[];
  savedSpaceIds?: string[];
  collectionId?: string;
  currentUserId?: string;
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
}: SpaceGridProps) {
  const [compact, setCompact] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? spaces : spaces.filter((s) => s.type === filter);

  const urlCount = spaces.filter((s) => s.type === "url").length;
  const htmlCount = spaces.filter((s) => s.type === "html").length;

  const counts: Record<FilterType, number> = {
    all: spaces.length,
    url: urlCount,
    html: htmlCount,
  };

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

        {/* Filter */}
        <div className="flex items-center gap-0.5">
          {filters.map(({ value, label, icon }) => {
            const active = filter === value;
            const count = counts[value];
            if (value !== "all" && count === 0) return null;
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div
        className={
          compact
            ? "grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9"
            : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {filtered.map((space) => {
          const username =
            showAuthor && "profiles" in space
              ? (space as SpaceWithProfile).profiles?.display_name || (space as SpaceWithProfile).profiles?.username
              : undefined;
          return (
            <SpaceCard
              key={space.id}
              space={space}
              username={username || undefined}
              editable={editable}
              liked={likedSpaceIds.includes(space.id)}
              saved={savedSpaceIds.includes(space.id)}
              compact={compact}
              collectionId={collectionId}
              isOwn={!!currentUserId && space.user_id === currentUserId}
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
            No {filter === "url" ? "website" : "custom page"} spaces here yet.
          </p>
        )}
      </div>
    </div>
  );
}
