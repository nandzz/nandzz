"use server";

import { createClient } from "@/lib/supabase/server";
import { updateBrandSchema } from "../schemas";

export type UpdateBrandResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "FAILED";
      message?: string;
    };

// Persists the brand page fields. The logo (if any) is uploaded client-side to
// the `avatars` bucket first; this action stores the resulting URL alongside the
// brand colors/values/description. Scoped to the caller's own row.
export async function updateBrand(input: {
  logoUrl: string | null;
  brandColors: Record<string, string>;
  brandValues: string[];
  brandDescription: string | null;
}): Promise<UpdateBrandResult> {
  const parsed = updateBrandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { logoUrl, brandColors, brandValues, brandDescription } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("profiles")
    .update({
      logo_url: logoUrl,
      brand_colors: brandColors,
      brand_values: brandValues,
      brand_description: brandDescription,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "FAILED", message: error.message };

  return { ok: true };
}
