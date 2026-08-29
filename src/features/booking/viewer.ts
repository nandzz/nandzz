import { createClient } from "@/lib/supabase/client";

// What we can prefill into the booking form from a signed-in visitor. Lives
// OUTSIDE components/ (like realtime.ts / storage.ts) so the flow component can
// read the live browser session without importing `@/lib/supabase/*` directly,
// which the no-restricted-imports guardrail forbids under components/**.
export type BookingViewer = { name: string; email: string; phone: string };

// The currently signed-in visitor's contact details, or null when there's no
// session. Name comes from the profile's display_name (falling back to the
// signup metadata); email/phone come straight off the auth user. Phone is
// normalized to an E.164 "+..." string when present. Booking widgets are public
// pages, so most visitors are guests and this returns null — that's expected.
export async function getBookingViewer(): Promise<BookingViewer | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const name = viewerName(profile?.display_name, user.user_metadata);
  const phone = user.phone ? `+${user.phone.replace(/^\+/, "")}` : "";

  return { name, email: user.email ?? "", phone };
}

// The signed-in visitor's state as it matters to the booking flow. `needsSetup`
// is true when there's a live session but no profile row yet — an OAuth signup
// that hasn't chosen a username. The booking flow uses it to finish onboarding
// INSIDE the modal instead of bouncing to a separate page.
export type BookingSession = {
  viewer: BookingViewer | null;
  needsSetup: boolean;
};

export async function getBookingSession(): Promise<BookingSession> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { viewer: null, needsSetup: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const viewer: BookingViewer = {
    name: viewerName(profile?.display_name, user.user_metadata),
    email: user.email ?? "",
    phone: user.phone ? `+${user.phone.replace(/^\+/, "")}` : "",
  };
  return { viewer, needsSetup: !profile };
}

function viewerName(
  displayName: string | null | undefined,
  metadata: Record<string, unknown> | undefined
): string {
  if (displayName) return displayName;
  const metaName = metadata?.display_name ?? metadata?.full_name ?? metadata?.name;
  return typeof metaName === "string" ? metaName : "";
}
