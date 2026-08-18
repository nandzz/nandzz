import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Server-only read: the deduped, sorted set of hashtags used across public
// spaces, offered as autocomplete suggestions in the content builder.
export async function getPublicHashtags(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data } = await supabase
    .from("spaces")
    .select("hashtags")
    .eq("is_public", true)
    .limit(200);
  if (!data) return [];
  return [...new Set(data.flatMap((s) => s.hashtags ?? []))].sort();
}
