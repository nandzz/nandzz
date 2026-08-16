"use server";

import { createClient } from "@/lib/supabase/server";
import { updateCollectionSchema } from "../schemas";

export type UpdateCollectionResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

export async function updateCollection(input: {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
}): Promise<UpdateCollectionResult> {
  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { id, name, description, isPublic } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  // RLS restricts updates to the owner; scope by user_id too for defense-in-depth.
  const { error } = await supabase
    .from("collections")
    .update({ name, description: description ?? null, is_public: isPublic })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "FAILED", message: error.message };
  return { ok: true };
}
