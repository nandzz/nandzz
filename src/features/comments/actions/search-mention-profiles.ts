"use server";

import { createClient } from "@/lib/supabase/server";
import { mentionQuerySchema } from "../schemas";

export type MentionUser = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// Public @mention autocomplete: username prefix search, capped at 5 results.
export async function searchMentionProfiles(query: string): Promise<MentionUser[]> {
  const parsed = mentionQuerySchema.safeParse({ query });
  if (!parsed.success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .ilike("username", `${parsed.data.query}%`)
    .limit(5);
  return (data ?? []) as MentionUser[];
}
