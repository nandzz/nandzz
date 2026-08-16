"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import type { CommentWithLike } from "@/lib/types";
import { loadMoreComments } from "../actions/load-more-comments";
import { postComment } from "../actions/post-comment";

const PAGE_SIZE = 20;

interface CommentsListProps {
  spaceId: string;
  spaceOwnerId: string;
  initialComments: CommentWithLike[];
  initialHasMore: boolean;
  userId: string | null;
  currentProfile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  onCountChange: (delta: number) => void;
}

export function CommentsList({
  spaceId,
  spaceOwnerId,
  initialComments,
  initialHasMore,
  userId,
  currentProfile,
  onCountChange,
}: CommentsListProps) {
  const [comments, setComments] = useState<CommentWithLike[]>(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, startLoadMore] = useTransition();

  const loadMore = () => {
    const last = comments[comments.length - 1];
    if (!last) return;

    startLoadMore(async () => {
      const result = await loadMoreComments({ spaceId, afterCreatedAt: last.created_at });
      if (!result.ok || result.comments.length === 0) {
        setHasMore(false);
        return;
      }
      setComments((prev) => [...prev, ...result.comments]);
      setHasMore(result.comments.length === PAGE_SIZE);
    });
  };

  const handlePostComment = async (content: string) => {
    if (!userId || !currentProfile) return;
    // The action performs the insert plus @mention rows and notifications.
    const result = await postComment({ spaceId, content });
    if (!result.ok) return;
    setComments((prev) => [...prev, result.comment]);
    onCountChange(+1);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCountChange(-1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable comments area */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center px-6">
            <p className="text-sm font-medium">No comments yet</p>
            <p className="text-xs text-muted-foreground">Be the first to share your thoughts</p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-5">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                userId={userId}
                currentProfile={currentProfile}
                spaceId={spaceId}
                spaceOwnerId={spaceOwnerId}
                onDelete={handleDeleteComment}
              />
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-2 text-xs text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more comments"
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input pinned at bottom */}
      <CommentInput
        userId={userId}
        currentProfile={currentProfile}
        onSubmit={handlePostComment}
      />
    </div>
  );
}
