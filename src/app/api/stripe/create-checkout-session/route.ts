// TODO: npm install stripe
// Then set STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, and STRIPE_WEBHOOK_SECRET in .env.local
//
// Price IDs (create in Stripe Dashboard → Products):
//   STRIPE_PRICE_PRO_MONTHLY=price_...
//   STRIPE_PRICE_PRO_ANNUAL=price_...

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!stripeKey) {
    return Response.json(
      {
        error: "Stripe is not configured yet.",
        instructions:
          "Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_PRICE_PRO_MONTHLY, and STRIPE_PRICE_PRO_ANNUAL to your .env.local file, then run: npm install stripe",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { billing?: string };
  const isAnnual = body.billing === "annual";
  const priceId = isAnnual
    ? process.env.STRIPE_PRICE_PRO_ANNUAL
    : process.env.STRIPE_PRICE_PRO_MONTHLY;

  if (!priceId) {
    return Response.json(
      { error: "Stripe price IDs not configured. Add STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_PRO_ANNUAL to .env.local" },
      { status: 503 }
    );
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
  // const session = await stripe.checkout.sessions.create({
  //   mode: "subscription",
  //   customer: profile?.stripe_customer_id ?? undefined,
  //   customer_email: profile?.stripe_customer_id ? undefined : user.email,
  //   line_items: [{ price: priceId, quantity: 1 }],
  //   success_url: `${siteUrl}/dashboard/billing?success=1`,
  //   cancel_url: `${siteUrl}/dashboard/billing?canceled=1`,
  //   metadata: { user_id: user.id },
  //   allow_promotion_codes: true,
  //   subscription_data: {
  //     metadata: { user_id: user.id },
  //   },
  // });
  //
  // return Response.json({ url: session.url });
  // -------------------------------------------------

  // Placeholder response until Stripe is configured:
  return Response.json(
    { error: "Stripe checkout is not yet activated. See route comments for setup instructions." },
    { status: 503 }
  );
}
