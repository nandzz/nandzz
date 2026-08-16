"use server";

import { createClient } from "@/lib/supabase/server";
import { getSpaceLikesCount } from "../data/social";
import { toggleLikeSchema } from "../schemas";

// Only success carries the authoritative new state; failures use the same
// discriminated-result shape as publishSpace so callers branch on `ok`.
export type ToggleLikeResult =
  | { ok: true; liked: boolean; likesCount: number }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

export async function toggleLike(input: {
  spaceId: string;
}): Promise<ToggleLikeResult> {
  const parsed = toggleLikeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { spaceId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  // Read current state so the toggle is idempotent (RLS also guards ownership).
  const { data: existing } = await supabase
    .from("space_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("space_id", spaceId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("space_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("space_id", spaceId);
    if (error) return { ok: false, error: "FAILED", message: error.message };
  } else {
    const { error } = await supabase
      .from("space_likes")
      .insert({ user_id: user.id, space_id: spaceId });
    if (error) return { ok: false, error: "FAILED", message: error.message };
  }

  const likesCount = await getSpaceLikesCount(supabase, spaceId);
  return { ok: true, liked: !existing, likesCount };
}
