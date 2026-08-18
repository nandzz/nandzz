import { createClient } from "@/lib/supabase/client";

// Client-side storage helpers for the booking feature. Staff and location
// photos upload browser → Supabase directly: the 1.5 MB image cap exceeds the
// default Server-Action body limit, so routing them through the SSR server is
// not an option (mirrors `features/profile/storage.ts` and
// `features/spaces/storage.ts`). Only the resulting `photo_url` write goes into
// the shared calendar config, persisted later through the update action.
//
// This module lives OUTSIDE `components/` so it does not trip the
// `no-restricted-imports` guardrail that bans `@/lib/supabase/*` there.

/** Returns the current authenticated user id, or null. Staff/location photos
 * live under the owner's auth uid because Storage RLS on the `avatars` bucket
 * requires the first path segment to equal it. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Uploads a cropped photo to the `avatars` bucket at a stable, upsert-able
 * path and returns its cache-busted public URL (the path is reused on every
 * re-upload, so the `?t=` query defeats the CDN cache). */
async function uploadAvatarPhoto(
  filePath: string,
  blob: Blob
): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return `${data.publicUrl}?t=${Date.now()}`;
}

/** Uploads a staff member's profile photo; returns its cache-busted public URL. */
export function uploadStaffPhoto(
  ownerId: string,
  staffId: string,
  blob: Blob
): Promise<string> {
  return uploadAvatarPhoto(`${ownerId}/staff/${staffId}.jpg`, blob);
}

/** Uploads a location's photo; returns its cache-busted public URL. */
export function uploadLocationPhoto(
  ownerId: string,
  locationId: string,
  blob: Blob
): Promise<string> {
  return uploadAvatarPhoto(`${ownerId}/location/${locationId}.jpg`, blob);
}
