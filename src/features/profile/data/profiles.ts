import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Space } from "@/lib/types";

// Server-only reads for the profile feature. Consolidates the profiles /
// user_follows / spaces access that used to be inlined inside the profile
// client components (settings + brand profile loads, the followers/following
// list, and the "see all" gallery modal).

// The logged-in user's own full profile row (settings + brand pages).
export async function getMyProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return (data as Profile) ?? null;
}

export type FollowUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// One page of a profile's followers or following. The FK-hinted embed resolves
// `profiles` to a single joined row at runtime; the generated types
// pessimistically widen it to an array, so cast through unknown to the real
// shape (mirrors the previous client query).
export async function getFollowList(
  supabase: SupabaseClient,
  profileId: string,
  type: "followers" | "following",
  from: number,
  to: number
): Promise<FollowUser[]> {
  const query =
    type === "followers"
      ? supabase
          .from("user_follows")
          .select(
            "profiles!user_follows_follower_id_fkey(id, username, display_name, avatar_url)"
          )
          .eq("following_id", profileId)
          .range(from, to)
      : supabase
          .from("user_follows")
          .select(
            "profiles!user_follows_following_id_fkey(id, username, display_name, avatar_url)"
          )
          .eq("follower_id", profileId)
          .range(from, to);

  const { data } = await query;
  return ((data ?? []) as unknown as Array<{ profiles: FollowUser | null }>)
    .map((row) => row.profiles)
    .filter((p): p is FollowUser => Boolean(p));
}

// One page of a profile's public image-type spaces, newest first, plus the exact
// total count (for the gallery modal's pagination).
export async function getPublicImageSpaces(
  supabase: SupabaseClient,
  profileId: string,
  from: number,
  to: number
): Promise<{ spaces: Space[]; count: number | null }> {
  const { data, count } = await supabase
    .from("spaces")
    .select("*", { count: "exact" })
    .eq("user_id", profileId)
    .eq("is_public", true)
    .eq("content_type", "image")
    .order("created_at", { ascending: false })
    .range(from, to);
  return { spaces: (data ?? []) as Space[], count: count ?? null };
}
