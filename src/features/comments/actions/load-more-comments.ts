"use server";

import { createClient } from "@/lib/supabase/server";
import type { CommentWithLike } from "@/lib/types";
import { loadMoreCommentsSchema } from "../schemas";
import { getCommentsAfter, getLikedCommentIds } from "../data/comments";

const PAGE_SIZE = 20;

export type LoadMoreCommentsResult =
  | { ok: true; comments: CommentWithLike[] }
  | { ok: false; error: "INVALID_INPUT" };

export async function loadMoreComments(input: {
  spaceId: string;
  afterCreatedAt: string;
}): Promise<LoadMoreCommentsResult> {
  const parsed = loadMoreCommentsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { spaceId, afterCreatedAt } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = await getCommentsAfter(supabase, spaceId, afterCreatedAt, PAGE_SIZE);
  const likedIds = user
    ? new Set(await getLikedCommentIds(supabase, user.id, rows.map((r) => r.id)))
    : new Set<string>();

  return {
    ok: true,
    comments: rows.map((r) => ({ ...r, liked: likedIds.has(r.id) })),
  };
}
