"use client";

import { useState } from "react";
import Link from "next/link";
import { SpaceCard } from "./SpaceCard";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LayoutGrid, Grid3X3 } from "lucide-react";
import type { SpaceWithProfile, Space } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { SECTIONS, resolveContentType, sectionForType, getSectionLabel, getSectionDescription, type SectionId } from "@/lib/spaces/content-types";

interface SpaceGridProps {
  spaces: SpaceWithProfile[] | Space[];
  showAuthor?: boolean;
  showCreateCard?: boolean;
  editable?: boolean;
  likedSpaceIds?: string[];
  savedSpaceIds?: string[];
  collectionId?: string;
  currentUserId?: string;
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
  ownerUsername,
}: SpaceGridProps) {
  const { t } = useLanguage();
  const [compact, setCompact] = useState(false);

  const gridClassName = compact
    ? "grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6"
    : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";

  // Stable partition of spaces into their display sections, preserving the
  // incoming (already created_at desc) order within each group.
  const grouped: Record<SectionId, (SpaceWithProfile | Space)[]> = {
    informative: [],
    gallery: [],
    links: [],
  };
  for (const space of spaces) {
    const sectionId = sectionForType(resolveContentType(space as Space));
    grouped[sectionId].push(space);
  }
  const nonEmptySections = Object.values(SECTIONS).filter(
    (section) => grouped[section.id].length > 0
  );

  const renderCard = (space: SpaceWithProfile | Space) => {
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
        hashtags={space.hashtags ?? []}
      />
    );
  };

  const createTile = (
    <Link
      key="create-tile"
      href={collectionId ? `/dashboard/contents/create-space?collectionId=${collectionId}` : "/dashboard/contents/create-space"}
    >
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
              {t.spaceGrid.addNew}
            </span>
          </div>
        ) : (
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100/80 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 group-hover:bg-violet-200/80 dark:group-hover:bg-violet-800/50 transition-colors">
              <Plus className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="font-medium">{t.spaceGrid.createNew}</span>
            <span className="text-sm text-muted-foreground text-center">
              {t.spaceGrid.createNewDesc}
            </span>
          </CardContent>
        )}
      </Card>
    </Link>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setCompact((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={compact ? t.spaceGrid.comfortableView : t.spaceGrid.compactView}
        >
          {compact ? (
            <>
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t.spaceGrid.comfortable}</span>
            </>
          ) : (
            <>
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.spaceGrid.compact}</span>
            </>
          )}
        </button>
      </div>

      {nonEmptySections.length > 0 ? (
        <div className="space-y-8">
          {nonEmptySections.map((section, index) => (
            <section key={section.id}>
              <div className="mb-3">
                <h2 className="text-lg font-semibold">
                  {getSectionLabel(t, section.id)}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({grouped[section.id].length})
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">{getSectionDescription(t, section.id)}</p>
              </div>
              <div className={gridClassName}>
                {grouped[section.id].map(renderCard)}
                {showCreateCard && index === 0 && createTile}
              </div>
            </section>
          ))}
        </div>
      ) : showCreateCard ? (
        <div className={gridClassName}>{createTile}</div>
      ) : (
        <p className="py-12 text-center text-muted-foreground text-sm">
          {t.spaceGrid.noFilter}
        </p>
      )}
    </div>
  );
}
