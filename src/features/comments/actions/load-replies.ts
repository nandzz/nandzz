"use server";

import { createClient } from "@/lib/supabase/server";
import type { CommentWithLike } from "@/lib/types";
import { loadRepliesSchema } from "../schemas";
import { getReplies, getLikedCommentIds } from "../data/comments";

export type LoadRepliesResult =
  | { ok: true; replies: CommentWithLike[] }
  | { ok: false; error: "INVALID_INPUT" };

export async function loadReplies(input: {
  parentId: string;
}): Promise<LoadRepliesResult> {
  const parsed = loadRepliesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = await getReplies(supabase, parsed.data.parentId);
  const likedIds =
    user && rows.length
      ? new Set(await getLikedCommentIds(supabase, user.id, rows.map((r) => r.id)))
      : new Set<string>();

  return {
    ok: true,
    replies: rows.map((r) => ({ ...r, liked: likedIds.has(r.id) })),
  };
}
