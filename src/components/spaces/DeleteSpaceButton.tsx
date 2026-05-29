"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface DeleteSpaceButtonProps {
  spaceId: string;
  redirectTo: string;
}

export function DeleteSpaceButton({ spaceId, redirectTo }: DeleteSpaceButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this space? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("spaces").delete().eq("id", spaceId);
    router.push(redirectTo);
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      onClick={handleDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Delete</span>
    </Button>
  );
}
