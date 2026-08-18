"use server";

import { createClient } from "@/lib/supabase/server";
import { getPublicHashtags } from "../data/hashtags";

// Client-invoked loader for the content builder's hashtag autocomplete. Returns
// the suggestion list directly (public data — no auth gate needed).
export async function loadHashtagSuggestions(): Promise<string[]> {
  const supabase = await createClient();
  return getPublicHashtags(supabase);
}
