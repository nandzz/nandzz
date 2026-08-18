"use client";

import { useEffect } from "react";
import { recordSpaceView } from "@/features/analytics";

interface ViewTrackerProps {
  spaceId: string;
  ownerId: string;
}

export function ViewTracker({ spaceId, ownerId }: ViewTrackerProps) {
  useEffect(() => {
    recordSpaceView(spaceId, ownerId);
  // Only fire once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
