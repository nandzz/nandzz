"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLike } from "../actions/toggle-like";

interface LikeButtonProps {
  spaceId: string;
  initialLikesCount: number;
  initialLiked?: boolean;
  size?: "sm" | "md";
}

export function LikeButton({
  spaceId,
  initialLikesCount,
  initialLiked = false,
  size = "sm",
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    const wasLiked = liked;
    const prevCount = likesCount;
    setLiked(!wasLiked);
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1);

    const result = await toggleLike({ spaceId });

    if (!result.ok) {
      // Revert optimistic update on any failure.
      setLiked(wasLiked);
      setLikesCount(prevCount);
      if (result.error === "UNAUTHENTICATED") router.push("/login");
      return;
    }

    // Reconcile with the server's authoritative state, then refresh other
    // server-rendered views of the same space.
    setLiked(result.liked);
    setLikesCount(result.likesCount);
    startTransition(() => router.refresh());
  };

  const iconSize = size === "sm" ? "size-3.5" : "size-5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center gap-1 rounded-md transition-colors hover:text-red-500",
        textSize,
        liked ? "text-red-500" : "text-muted-foreground"
      )}
    >
      <Heart className={cn(iconSize, liked && "fill-red-500")} />
      <span>{likesCount}</span>
    </button>
  );
}
