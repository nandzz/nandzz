import { z } from "zod";

export const postCommentSchema = z.object({
  spaceId: z.uuid(),
  content: z.string().trim().min(1).max(5000),
  parentId: z.uuid().nullish(),
});

export const commentIdSchema = z.object({ commentId: z.uuid() });

export const loadMoreCommentsSchema = z.object({
  spaceId: z.uuid(),
  afterCreatedAt: z.string().min(1),
});

export const loadRepliesSchema = z.object({ parentId: z.uuid() });

// Mention autocomplete query — bounded to keep the ilike prefix search cheap.
export const mentionQuerySchema = z.object({ query: z.string().max(20) });

export type PostCommentInput = z.infer<typeof postCommentSchema>;
