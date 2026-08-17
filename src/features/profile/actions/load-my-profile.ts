"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { getMyProfile } from "../data/profiles";

export type LoadMyProfileResult =
  | { ok: true; profile: Profile | null }
  | { ok: false; error: "UNAUTHENTICATED" };

// Client-invoked read for the settings + brand pages, which mount client-side
// and load the signed-in user's own profile row.
export async function loadMyProfile(): Promise<LoadMyProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const profile = await getMyProfile(supabase, user.id);
  return { ok: true, profile };
}
