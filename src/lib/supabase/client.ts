import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Single browser client for the whole tab. `createBrowserClient` is meant to
// hand back a singleton, but calling it fresh from every chrome component
// (Sidebar, Navbar, MobileTabBar, AppChrome, the auth helpers) — amplified by
// React Strict Mode's double-mount in dev — spun up multiple GoTrueClient
// instances. They then contended on the shared auth Web Lock
// (`lock:sb-<ref>-auth-token`), which ended up held indefinitely: every
// `auth.signOut()` (and any other auth call) queued behind it and hung
// forever, so logout appeared to do nothing. Memoising guarantees one instance.
let client: SupabaseClient | undefined;

export function createClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Bypass the navigator Web Lock. It exists only to serialise token
        // refreshes across tabs, but here it was deadlocking (a held lock that
        // never released). A pass-through that just runs the operation removes
        // the deadlock; the cost is uncoordinated refreshes across tabs, which
        // is harmless for this app.
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    }
  );
  return client;
}
