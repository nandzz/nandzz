"use server";

import { createClient } from "@/lib/supabase/server";
import { createCollectionSchema, type CreateCollectionInput } from "../schemas";

export type CreateCollectionResult =
  | { ok: true; collection: { id: string; name: string } }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

export async function createCollection(
  input: CreateCollectionInput
): Promise<CreateCollectionResult> {
  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { name, description, isPublic } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { data, error } = await supabase
    .from("collections")
    .insert({
      name,
      description: description ?? null,
      is_public: isPublic,
      user_id: user.id,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return { ok: false, error: "FAILED", message: error?.message };
  }
  return { ok: true, collection: data };
}
