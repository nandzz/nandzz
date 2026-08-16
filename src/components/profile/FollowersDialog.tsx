"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { FollowList } from "./FollowList";
import { useLanguage } from "@/contexts/LanguageContext";

interface FollowersDialogProps {
  profileId: string;
  type: "followers" | "following";
  count: number;
  children: React.ReactNode;
}

export function FollowersDialog({ profileId, type, count, children }: FollowersDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => count > 0 && setOpen(true)}
        className={
          count > 0
            ? "cursor-pointer rounded-sm hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            : "cursor-default"
        }
      >
        {children}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={type === "followers" ? t.profile.followersTitle : t.profile.followingTitle}>
        {/* The query/pagination lives in FollowList; the dialog only frames it.
            Dialog unmounts its children when closed, so the list re-fetches
            fresh each time it opens (the previous lazy-on-open behavior). */}
        <FollowList profileId={profileId} type={type} scrollable onNavigate={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
