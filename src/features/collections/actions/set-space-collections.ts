"use server";

import { createClient } from "@/lib/supabase/server";
import { setSpaceCollectionsSchema } from "../schemas";

export type SetSpaceCollectionsResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Apply the picker's diff for one space: add memberships and remove the ones the
// user unchecked. RLS on collection_spaces enforces that the target collections
// belong to the user.
export async function setSpaceCollections(input: {
  spaceId: string;
  add: string[];
  remove: string[];
}): Promise<SetSpaceCollectionsResult> {
  const parsed = setSpaceCollectionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { spaceId, add, remove } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  if (add.length > 0) {
    const { error } = await supabase
      .from("collection_spaces")
      .insert(add.map((collection_id) => ({ collection_id, space_id: spaceId })));
    if (error) return { ok: false, error: "FAILED", message: error.message };
  }

  if (remove.length > 0) {
    const { error } = await supabase
      .from("collection_spaces")
      .delete()
      .eq("space_id", spaceId)
      .in("collection_id", remove);
    if (error) return { ok: false, error: "FAILED", message: error.message };
  }

  return { ok: true };
}
