import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton — the service-role client is stateless (no per-user session) and safe
// to share across Next.js route-handler / server-component invocations. Re-creating
// it on every request churned a fresh SupabaseClient (GoTrue + admin API + fetch
// wrappers) per call across ~50 call sites, adding needless allocation pressure on
// hot paths like /dashboard/bookings. Mirrors the Stripe client singleton in
// src/lib/stripe/server.ts.
let cached: SupabaseClient | null = null;

// Service-role client — bypasses RLS. Only use server-side, never expose to the browser.
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars: ${!url ? "NEXT_PUBLIC_SUPABASE_URL" : ""} ${!key ? "SUPABASE_SERVICE_ROLE_KEY" : ""}`.trim()
    );
  }
  // autoRefreshToken/persistSession off: the service-role key is a static JWT with
  // no session to refresh, so there's nothing to persist or tick in the background.
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
