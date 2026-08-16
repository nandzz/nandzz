import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpaceCommentWithProfile } from "@/lib/types";

const COMMENT_SELECT = "*, profiles:user_id(username, display_name, avatar_url)";

// First page of top-level comments for a space (oldest first).
export async function getTopLevelComments(
  supabase: SupabaseClient,
  spaceId: string,
  limit: number
): Promise<SpaceCommentWithProfile[]> {
  const { data } = await supabase
    .from("space_comments")
    .select(COMMENT_SELECT)
    .eq("space_id", spaceId)
    .is("parent_id", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as unknown as SpaceCommentWithProfile[];
}

// Next page of top-level comments after a cursor timestamp.
export async function getCommentsAfter(
  supabase: SupabaseClient,
  spaceId: string,
  afterCreatedAt: string,
  limit: number
): Promise<SpaceCommentWithProfile[]> {
  const { data } = await supabase
    .from("space_comments")
    .select(COMMENT_SELECT)
    .eq("space_id", spaceId)
    .is("parent_id", null)
    .gt("created_at", afterCreatedAt)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as unknown as SpaceCommentWithProfile[];
}

// Replies under a parent comment (oldest first).
export async function getReplies(
  supabase: SupabaseClient,
  parentId: string
): Promise<SpaceCommentWithProfile[]> {
  const { data } = await supabase
    .from("space_comments")
    .select(COMMENT_SELECT)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as SpaceCommentWithProfile[];
}

// Which of `commentIds` the user has liked.
export async function getLikedCommentIds(
  supabase: SupabaseClient,
  userId: string,
  commentIds: string[]
): Promise<string[]> {
  if (commentIds.length === 0) return [];
  const { data } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", commentIds);
  return data?.map((l) => l.comment_id as string) ?? [];
}
