"use server";

import { createClient } from "@/lib/supabase/server";
import { spaceIdSchema } from "../schemas";
import { getUserCollections, getSpaceCollectionIds } from "../data/collections";

export type LoadSpaceCollectionsResult =
  | {
      ok: true;
      collections: { id: string; name: string }[];
      memberOfIds: string[];
    }
  | { ok: false; error: "UNAUTHENTICATED" | "INVALID_INPUT" };

// Client-invoked loader for the add-to-collection dialog: the user's collections
// plus which of them already contain this space.
export async function loadSpaceCollections(input: {
  spaceId: string;
}): Promise<LoadSpaceCollectionsResult> {
  const parsed = spaceIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const [collections, memberOfIds] = await Promise.all([
    getUserCollections(supabase, user.id),
    getSpaceCollectionIds(supabase, parsed.data.spaceId),
  ]);

  return { ok: true, collections, memberOfIds };
}
