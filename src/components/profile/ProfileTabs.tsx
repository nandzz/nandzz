"use client";

import { SpaceGrid } from "@/components/spaces/SpaceGrid";
import type { Space, Profile } from "@/lib/types";

interface ProfileTabsProps {
  spaces: Space[];
  profile: Profile;
  likedSpaceIds?: string[];
}

export function ProfileTabs({ spaces, profile, likedSpaceIds = [] }: ProfileTabsProps) {
  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold">
        {profile.display_name || profile.username}&apos;s Spaces
      </h2>
      <div className="mt-6">
        {spaces.length > 0 ? (
          <SpaceGrid spaces={spaces} likedSpaceIds={likedSpaceIds} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            No public spaces yet.
          </p>
        )}
      </div>
    </div>
  );
}
