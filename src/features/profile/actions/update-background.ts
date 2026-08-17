"use server";

import { createClient } from "@/lib/supabase/server";
import {
  updateBackgroundSchema,
  updateBackgroundPositionSchema,
} from "../schemas";

export type UpdateBackgroundResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Sets or clears the cover image + its focal position. Used both after an upload
// (url + "50% 50%") and on removal (null + null). Storage file management stays
// client-side (features/profile/storage).
export async function updateBackground(input: {
  backgroundUrl: string | null;
  backgroundPosition: string | null;
}): Promise<UpdateBackgroundResult> {
  const parsed = updateBackgroundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("profiles")
    .update({
      background_url: parsed.data.backgroundUrl,
      background_position: parsed.data.backgroundPosition,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "FAILED", message: error.message };

  return { ok: true };
}

// Saves only the focal position (drag-to-reposition), leaving the image intact.
export async function updateBackgroundPosition(input: {
  backgroundPosition: string;
}): Promise<UpdateBackgroundResult> {
  const parsed = updateBackgroundPositionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("profiles")
    .update({ background_position: parsed.data.backgroundPosition })
    .eq("id", user.id);
  if (error) return { ok: false, error: "FAILED", message: error.message };

  return { ok: true };
}
