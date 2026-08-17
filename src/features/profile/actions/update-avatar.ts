"use server";

import { createClient } from "@/lib/supabase/server";
import { updateAvatarSchema } from "../schemas";

export type UpdateAvatarResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Persists the avatar public URL after the client has uploaded the image to the
// `avatars` bucket (upload stays browser-side — see features/profile/storage).
export async function updateAvatar(input: {
  avatarUrl: string;
}): Promise<UpdateAvatarResult> {
  const parsed = updateAvatarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data.avatarUrl })
    .eq("id", user.id);
  if (error) return { ok: false, error: "FAILED", message: error.message };

  return { ok: true };
}
