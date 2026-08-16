"use server";

import { createClient } from "@/lib/supabase/server";
import { commentIdSchema } from "../schemas";

export type ToggleCommentLikeResult =
  | { ok: true; liked: boolean; likesCount: number }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

export async function toggleCommentLike(input: {
  commentId: string;
}): Promise<ToggleCommentLikeResult> {
  const parsed = commentIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { commentId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { data: existing } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", user.id)
    .eq("comment_id", commentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("comment_id", commentId);
    if (error) return { ok: false, error: "FAILED", message: error.message };
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .insert({ user_id: user.id, comment_id: commentId });
    if (error) return { ok: false, error: "FAILED", message: error.message };
  }

  const { count } = await supabase
    .from("comment_likes")
    .select("comment_id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  return { ok: true, liked: !existing, likesCount: count ?? 0 };
}
