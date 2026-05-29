import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Only use server-side, never expose to the browser.
export function createAdminClient() {
  // Bracket notation prevents Turbopack from replacing these with build-time values
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars: ${!url ? "NEXT_PUBLIC_SUPABASE_URL" : ""} ${!key ? "SUPABASE_SERVICE_ROLE_KEY" : ""}`.trim()
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
