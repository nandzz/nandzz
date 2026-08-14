import { createClient } from "@/lib/supabase/client";

/**
 * Persists a partial update to the owner's profile row and invalidates the
 * cached public profile page so the server re-render reflects it. Callers do
 * their own optimistic UI + `router.refresh()`; this centralises the write +
 * revalidate sequence shared by the layout pickers and section reorder.
 */
export async function persistProfileUpdate(
  profileId: string,
  username: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", profileId);
  if (error) throw error;
  await fetch("/api/profile/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
}
