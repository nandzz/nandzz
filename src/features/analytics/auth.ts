import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileLite } from "@/lib/types";

// Client-side auth-session + profile helpers for the layout chrome
// (Navbar / Sidebar / MobileTabBar). Supabase Auth (`getUser`,
// `onAuthStateChange`, `signOut`) fundamentally requires the browser client,
// and the chrome re-reads the signed-in user's profile row reactively as that
// session changes — so, like `realtime.ts` / `storage.ts`, this lives OUTSIDE
// `components/` to satisfy the `no-restricted-imports` guardrail. The chrome
// components consume these helpers and never touch `@/lib/supabase/*`
// themselves.

/** The current signed-in user (id only), or null. */
export async function getSessionUser(): Promise<{ id: string } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id } : null;
}

/**
 * Subscribes to auth-state changes, invoking `cb` with the signed-in user
 * (id only) or null on sign-out. Returns an unsubscribe function.
 */
export function onAuthChange(
  cb: (user: { id: string } | null) => void
): () => void {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ? { id: session.user.id } : null);
  });
  return () => subscription.unsubscribe();
}

/** Signs the current user out. */
export async function signOutUser(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/** The signed-in user's full profile row (Navbar avatar dropdown). */
export async function fetchProfileFull(
  userId: string
): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return (data as Profile) ?? null;
}

/** The signed-in user's lite profile row (Sidebar / MobileTabBar). */
export async function fetchProfileLite(
  userId: string
): Promise<ProfileLite | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .single();
  return (data as ProfileLite) ?? null;
}
