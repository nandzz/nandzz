"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const PAGE_SIZE = 20;

interface FollowListProps {
  profileId: string;
  type: "followers" | "following";
  // The dialog wants a capped, inner-scrolling box; the standalone dashboard
  // page lets the list flow in the page.
  scrollable?: boolean;
  // Fired when a row is tapped — lets the dialog close itself on navigation.
  onNavigate?: () => void;
}

// Shared followers/following list + pagination. Lives here (not in the dialog)
// so the /dashboard/followers and /dashboard/following pages and the profile
// dialog all run the exact same query.
export function FollowList({ profileId, type, scrollable = false, onNavigate }: FollowListProps) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (from: number, append: boolean) => {
    const supabase = createClient();
    const to = from + PAGE_SIZE - 1;

    const query =
      type === "followers"
        ? supabase
            .from("user_follows")
            .select("profiles!user_follows_follower_id_fkey(id, username, display_name, avatar_url)")
            .eq("following_id", profileId)
            .range(from, to)
        : supabase
            .from("user_follows")
            .select("profiles!user_follows_following_id_fkey(id, username, display_name, avatar_url)")
            .eq("follower_id", profileId)
            .range(from, to);

    const { data } = await query;
    // The FK-hinted embed resolves `profiles` to a single joined row at runtime;
    // the generated types pessimistically widen it to an array, so cast through
    // unknown to the real shape.
    const rows = ((data ?? []) as unknown as Array<{ profiles: UserRow | null }>)
      .map((row) => row.profiles)
      .filter((p): p is UserRow => Boolean(p));

    setUsers((prev) => (append ? [...prev, ...rows] : rows));
    setHasMore(rows.length === PAGE_SIZE);
    setOffset(from + rows.length);
  }, [profileId, type]);

  useEffect(() => {
    setUsers([]);
    setOffset(0);
    setHasMore(false);
    setLoading(true);
    fetchPage(0, false).finally(() => setLoading(false));
  }, [fetchPage]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchPage(offset, true);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-sm text-muted-foreground">{t.profile.loadingUsers}</div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex justify-center py-8 text-sm text-muted-foreground">
        {type === "followers" ? t.profile.noFollowers : t.profile.noFollowing}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <ul
        className={cn(
          "divide-y divide-border -mx-2",
          scrollable && "max-h-80 overflow-y-auto overscroll-contain"
        )}
      >
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/${u.username}`}
              onClick={onNavigate}
              className="flex items-center gap-3 px-2 py-3 hover:bg-muted/50 rounded-md transition-colors"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={u.avatar_url || undefined} alt="" />
                <AvatarFallback className="text-sm bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                  {(u.display_name || u.username)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="pt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full border-border/60 text-muted-foreground"
          >
            {loadingMore ? t.profile.loadingUsers : t.profile.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
