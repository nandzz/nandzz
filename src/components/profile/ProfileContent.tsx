"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import type { Space, Profile } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileContentProps {
  spaces: Space[];
  totalCount: number;
  profile: Profile;
  likedSpaceIds?: string[];
  savedSpaceIds?: string[];
  currentUserId?: string;
}

export function ProfileContent({
  spaces,
  totalCount,
  profile,
  likedSpaceIds = [],
  savedSpaceIds = [],
  currentUserId,
}: ProfileContentProps) {
  const { t } = useLanguage();

  // Empty state is handled at the page level (so it isn't shown when the
  // gallery has images but there are no non-image contents).
  if (spaces.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {t.profile.contentsTitle}
          <span className="ml-1.5 text-sm font-normal text-muted-foreground tabular-nums">
            {totalCount}
          </span>
        </h2>
        {totalCount > spaces.length && (
          <Link
            href={`/${profile.username}/contents`}
            className="flex items-center gap-0.5 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            {t.profile.seeMore}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div
        className="-mx-1 flex gap-4 overflow-x-auto scroll-smooth px-1 pt-1 pb-6 snap-x snap-mandatory scrollbar-hide"
      >
        {spaces.map((space) => (
          <div key={space.id} className="w-[240px] shrink-0 snap-start">
            <SpaceCard
              space={space}
              routeUsername={profile.username}
              liked={likedSpaceIds.includes(space.id)}
              saved={savedSpaceIds.includes(space.id)}
              isOwn={!!currentUserId && space.user_id === currentUserId}
              hashtags={space.hashtags ?? []}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}
