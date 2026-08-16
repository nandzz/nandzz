"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toggleFollow } from "../actions/toggle-follow";

interface FollowButtonProps {
  profileId: string;
  initialIsFollowing: boolean;
}

export function FollowButton({ profileId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useLanguage();

  const handleClick = async () => {
    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    const result = await toggleFollow({ profileId });

    if (!result.ok) {
      setIsFollowing(wasFollowing);
      if (result.error === "UNAUTHENTICATED") router.push("/login");
      return;
    }

    setIsFollowing(result.isFollowing);
    startTransition(() => router.refresh());
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className={cn(
        "gap-1.5 transition-all",
        isFollowing && "border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-red-500 hover:border-red-200 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-800"
      )}
    >
      {isFollowing ? (
        <UserCheck className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {isFollowing ? t.profile.followingBtn : t.profile.follow}
    </Button>
  );
}
