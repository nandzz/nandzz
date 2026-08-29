import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, ProfileLite } from "@/lib/types";

// Server-only read for the layout chrome's SSR seed. Kept for callers that
// only need the lite shape; the root layout now seeds the full row via
// `getChromeProfile` below so `AuthProvider` doesn't need a client refetch.
export async function getChromeProfileLite(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileLite | null> {
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, account_type")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return {
    ...(data as ProfileLite),
    account_type: (data as ProfileLite).account_type ?? "personal",
  };
}

// Server-only read for the layout chrome's SSR seed. The root layout renders
// `AuthProvider` (wrapping `AppChrome`) with this full row as `initialProfile`
// so the chrome (avatar/name/business gating/plan_slug) paints on first
// response with zero client round-trip, and `AuthProvider` only needs to
// resolve plan entitlements afterward.
export async function getChromeProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return (data as Profile) ?? null;
}
