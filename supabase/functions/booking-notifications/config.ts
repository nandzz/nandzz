// Loads the editable email templates from the DB (app_settings row
// `booking_email_template`, seeded by migration and edited in the nandzz-admin
// app). This is the SINGLE source of the email layout/copy — the edge function
// carries no HTML of its own beyond a bare emergency fallback (see index.ts).
// Shape: { customer|business: { <kind>: { <locale>: { subject, html } } } }.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Locale } from "./types.ts";

export const TEMPLATE_SETTING_KEY = "booking_email_template";

export type EmailContent = { subject: string; html: string };
export type EmailTemplates = {
  customer: Record<string, Partial<Record<Locale, EmailContent>>>;
  business: Record<string, Partial<Record<Locale, EmailContent>>>;
};

function isContent(v: unknown): v is EmailContent {
  return !!v && typeof v === "object"
    && typeof (v as EmailContent).subject === "string"
    && typeof (v as EmailContent).html === "string";
}

// Read + shallow-validate the templates row. Returns null when the row is
// missing or malformed so the caller can fall back and log.
export async function loadTemplates(admin: SupabaseClient): Promise<EmailTemplates | null> {
  try {
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", TEMPLATE_SETTING_KEY)
      .maybeSingle();
    const value = (data as { value?: unknown } | null)?.value;
    if (!value || typeof value !== "object") return null;
    const v = value as Record<string, unknown>;
    if (!v.customer || !v.business) return null;
    return v as EmailTemplates;
  } catch {
    return null;
  }
}

// Resolve one template by audience/kind/locale, falling back to `en`, then to
// null if the kind isn't present at all.
export function pickTemplate(
  templates: EmailTemplates,
  audience: "customer" | "business",
  kind: string,
  locale: Locale,
): EmailContent | null {
  const table = templates[audience]?.[kind];
  if (!table) return null;
  const entry = table[locale] ?? table.en;
  return isContent(entry) ? entry : null;
}
