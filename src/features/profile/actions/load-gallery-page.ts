"use server";

import { createClient } from "@/lib/supabase/server";
import type { Space } from "@/lib/types";
import { galleryPageSchema } from "../schemas";
import { getPublicImageSpaces } from "../data/profiles";

const PAGE_SIZE = 12;

export type LoadGalleryPageResult =
  | { ok: true; spaces: Space[]; count: number | null }
  | { ok: false; error: "INVALID_INPUT" };

// Client-invoked loader for the profile "see all" gallery modal: one page of a
// profile's public image spaces plus the exact total count.
export async function loadGalleryPage(input: {
  profileId: string;
  page: number;
}): Promise<LoadGalleryPageResult> {
  const parsed = galleryPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { profileId, page } = parsed.data;

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { spaces, count } = await getPublicImageSpaces(
    supabase,
    profileId,
    from,
    to
  );

  return { ok: true, spaces, count };
}
