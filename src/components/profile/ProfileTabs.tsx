"use client";

import { useState } from "react";
import { SpaceGrid } from "@/components/spaces/SpaceGrid";
import { Bookmark, FolderOpen, LayoutGrid } from "lucide-react";
import type { Space, Profile, CollectionWithSpaces } from "@/lib/types";

interface ProfileTabsProps {
  spaces: Space[];
  collections: CollectionWithSpaces[];
  profile: Profile;
  likedSpaceIds?: string[];
  savedSpaceIds?: string[];
  currentUserId?: string;
}

export function ProfileTabs({
  spaces,
  collections,
  profile,
  likedSpaceIds = [],
  savedSpaceIds = [],
  currentUserId,
}: ProfileTabsProps) {
  // Sort so the Starred (default) collection always appears first
  const sortedCollections = [...collections].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return 0;
  });

  const [activeTab, setActiveTab] = useState<string>("all");

  const displayName = profile.display_name || profile.username;

  const activeCollection = sortedCollections.find((c) => c.id === activeTab);

  const visibleSpaces: Space[] =
    activeTab === "all"
      ? spaces
      : (activeCollection?.collection_spaces
          .map((cs) => cs.spaces)
          .filter(Boolean) as Space[]) ?? [];

  const emptyMessage =
    activeTab === "all"
      ? "No public spaces yet."
      : `No spaces in this collection yet.`;

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/50 scrollbar-hide">
        {/* All tab */}
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors flex-shrink-0 ${
            activeTab === "all"
              ? "text-foreground bg-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          All
          <span className="ml-0.5 text-xs text-muted-foreground">
            ({spaces.length})
          </span>
        </button>

        {/* Collection tabs */}
        {sortedCollections.map((col) => {
          const count = col.collection_spaces.length;
          const isActive = activeTab === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveTab(col.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors flex-shrink-0 ${
                isActive
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {col.is_default
                ? <Bookmark className="h-3.5 w-3.5" />
                : <FolderOpen className="h-3.5 w-3.5" />
              }
              {col.name}
              <span className="ml-0.5 text-xs text-muted-foreground">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {visibleSpaces.length > 0 ? (
          <SpaceGrid spaces={visibleSpaces} likedSpaceIds={likedSpaceIds} savedSpaceIds={savedSpaceIds} currentUserId={currentUserId} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
