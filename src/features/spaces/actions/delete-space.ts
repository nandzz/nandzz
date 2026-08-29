"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { spaceIdSchema } from "../schemas";

export type DeleteSpaceResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length).split("?")[0];
}

// Removes the space's uploaded assets from storage before dropping the row, so
// deleting content never orphans blobs. Folded in from the old
// `@/lib/delete-space` helper; storage removals + the row delete run under the
// caller's session, so RLS remains the guard.
async function cleanupSpaceAssets(
  supabase: SupabaseClient,
  spaceId: string
): Promise<void> {
  const { data: space } = await supabase
    .from("spaces")
    .select("preview_image_url, html_url, pdf_url, image_url")
    .eq("id", spaceId)
    .single();

  if (!space) return;

  const removals: Promise<unknown>[] = [];
  const buckets: Array<[string | null, string]> = [
    [space.preview_image_url, "space-previews"],
    [space.html_url, "space-html"],
    [space.pdf_url, "space-pdfs"],
    [space.image_url, "space-images"],
  ];
  for (const [url, bucket] of buckets) {
    if (!url) continue;
    const path = extractStoragePath(url, bucket);
    if (path) removals.push(supabase.storage.from(bucket).remove([path]));
  }
  await Promise.all(removals);
}

export async function deleteSpace(input: {
  id: string;
}): Promise<DeleteSpaceResult> {
  const parsed = spaceIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  await cleanupSpaceAssets(supabase, parsed.data.id);

  const { error } = await supabase
    .from("spaces")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "FAILED", message: error.message };

  // A deleted space appears on the owner's public profile and across the
  // dashboard lists. Revalidating from the action invalidates both the
  // server full-route cache AND the client Router Cache, so the subsequent
  // client navigation lands on a fresh page instead of a stale cached one.
  revalidatePath("/", "layout");

  return { ok: true };
}
