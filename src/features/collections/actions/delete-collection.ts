"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteCollectionSchema } from "../schemas";

export type DeleteCollectionResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

export async function deleteCollection(input: {
  id: string;
}): Promise<DeleteCollectionResult> {
  const parsed = deleteCollectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "FAILED", message: error.message };
  return { ok: true };
}
