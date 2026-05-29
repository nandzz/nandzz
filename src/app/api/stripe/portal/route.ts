// TODO: npm install stripe
// Creates a Stripe Customer Portal session for managing subscriptions.
// Configure in Stripe Dashboard → Settings → Customer portal

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!stripeKey) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Activate when stripe package is installed ---
  // const Stripe = (await import("stripe")).default;
  // const stripe = new Stripe(stripeKey);
  //
  // const { data: profile } = await supabase
  //   .from("profiles")
  //   .select("stripe_customer_id")
  //   .eq("id", user.id)
  //   .single();
  //
  // if (!profile?.stripe_customer_id) {
  //   return Response.json({ error: "No active subscription found" }, { status: 400 });
  // }
  //
  // const portalSession = await stripe.billingPortal.sessions.create({
  //   customer: profile.stripe_customer_id,
  //   return_url: `${siteUrl}/dashboard/billing`,
  // });
  //
  // return Response.json({ url: portalSession.url });
  // -------------------------------------------------

  return Response.json(
    { error: "Stripe billing portal not yet activated. See route comments for setup." },
    { status: 503 }
  );
}
