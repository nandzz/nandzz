"use server";

import { createClient } from "@/lib/supabase/server";
import { toggleFollowSchema } from "../schemas";

export type ToggleFollowResult =
  | { ok: true; isFollowing: boolean }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "SELF_FOLLOW" | "FAILED";
      message?: string;
    };

export async function toggleFollow(input: {
  profileId: string;
}): Promise<ToggleFollowResult> {
  const parsed = toggleFollowSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { profileId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  // DB enforces `follower_id != following_id`; reject early with a clear code.
  if (user.id === profileId) return { ok: false, error: "SELF_FOLLOW" };

  const { data: existing } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", profileId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", profileId);
    if (error) return { ok: false, error: "FAILED", message: error.message };
  } else {
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: user.id, following_id: profileId });
    if (error) return { ok: false, error: "FAILED", message: error.message };
  }

  return { ok: true, isFollowing: !existing };
}
