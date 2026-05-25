"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Optimistic update
    const wasLiked = liked;
    const prevCount = likesCount;
    setLiked(!wasLiked);
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("space_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("space_id", spaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("space_likes")
          .insert({ user_id: user.id, space_id: spaceId });
        if (error) throw error;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      // Revert optimistic update on error
      setLiked(wasLiked);
      setLikesCount(prevCount);
    }
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
      <Heart
        className={cn(iconSize, liked && "fill-red-500")}
      />
      <span>{likesCount}</span>
    </button>
  );
}
