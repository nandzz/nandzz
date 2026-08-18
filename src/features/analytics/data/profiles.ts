import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileLite } from "@/lib/types";

// Server-only read for the layout chrome's SSR seed. The root layout renders
// AppChrome, which hands the Sidebar an `initialProfile` so the rail paints the
// avatar/name without a client round-trip on first paint.
export async function getChromeProfileLite(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileLite | null> {
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .single();
  return (data as ProfileLite) ?? null;
}
