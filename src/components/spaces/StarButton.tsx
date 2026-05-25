"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface StarButtonProps {
  spaceId: string;
  initialSaved?: boolean;
  size?: "sm" | "md";
  onToggle?: (saved: boolean) => void;
}

export function StarButton({
  spaceId,
  initialSaved = false,
  size = "sm",
  onToggle,
}: StarButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
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

    // Get or create the user's default "Starred" collection
    let { data: collection } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    if (!collection) {
      const { data: newCollection } = await supabase
        .from("collections")
        .insert({
          user_id: user.id,
          name: "Starred",
          description: "Spaces I've saved from the community",
          is_public: true,
          is_default: true,
        })
        .select("id")
        .single();
      collection = newCollection;
    }

    if (!collection) return;

    const wasSaved = saved;
    setSaved(!wasSaved);
    onToggle?.(!wasSaved);

    try {
      if (wasSaved) {
        const { error } = await supabase
          .from("collection_spaces")
          .delete()
          .eq("collection_id", collection.id)
          .eq("space_id", spaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("collection_spaces")
          .insert({ collection_id: collection.id, space_id: spaceId });
        if (error) throw error;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setSaved(wasSaved);
      onToggle?.(wasSaved);
    }
  };

  const iconSize = size === "sm" ? "size-3.5" : "size-5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={saved ? "Remove from Starred" : "Save to Starred"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md transition-colors hover:text-violet-500",
        textSize,
        saved ? "text-violet-500" : "text-muted-foreground"
      )}
    >
      <Bookmark className={cn(iconSize, saved && "fill-violet-500")} />
    </button>
  );
}
