import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The signed-in user's id from the locally-verified JWT — no `/auth/v1/user`
 * round-trip. `getClaims()` validates the token against the project's
 * asymmetric (ES256) signing key in-process (see the note in `proxy.ts`).
 *
 * Use this on protected read paths (`/dashboard/*`) where the proxy has already
 * run `getClaims()` and redirected unauthenticated visitors before the page
 * renders — the claims are guaranteed present and valid, so `getUser()`'s
 * network verification is redundant latency. For mutations that must fail
 * closed on a revoked-but-unexpired token, prefer `getUser()`.
 */
export async function getUserIdFromClaims(
  supabase: SupabaseServerClient
): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
