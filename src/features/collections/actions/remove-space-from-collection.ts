"use server";

import { createClient } from "@/lib/supabase/server";
import { removeSpaceFromCollectionSchema } from "../schemas";

export type RemoveSpaceFromCollectionResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Removes a single space from one collection. RLS on `collection_spaces` scopes
// the delete to collections the caller owns, so a non-owner's request is a
// no-op rather than a leak.
export async function removeSpaceFromCollection(input: {
  collectionId: string;
  spaceId: string;
}): Promise<RemoveSpaceFromCollectionResult> {
  const parsed = removeSpaceFromCollectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("collection_spaces")
    .delete()
    .eq("collection_id", parsed.data.collectionId)
    .eq("space_id", parsed.data.spaceId);
  if (error) return { ok: false, error: "FAILED", message: error.message };

  return { ok: true };
}
