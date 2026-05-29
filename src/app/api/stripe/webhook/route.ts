// TODO: npm install stripe
// Stripe sends events here when subscriptions are created, updated, or cancelled.
// Configure in Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL: https://your-domain.com/api/stripe/webhook
//   Events: customer.subscription.created, customer.subscription.updated,
//           customer.subscription.deleted, checkout.session.completed

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // --- Activate when stripe package is installed ---
  // const Stripe = (await import("stripe")).default;
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //
  // let event: Stripe.Event;
  // try {
  //   const body = await request.text();
  //   event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  // } catch {
  //   return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  // }
  //
  // const supabase = createAdminClient();
  //
  // switch (event.type) {
  //   case "checkout.session.completed": {
  //     const session = event.data.object as Stripe.Checkout.Session;
  //     const userId = session.metadata?.user_id;
  //     const customerId = session.customer as string;
  //     if (userId && customerId) {
  //       await supabase
  //         .from("profiles")
  //         .update({ stripe_customer_id: customerId, plan_tier: "pro" })
  //         .eq("id", userId);
  //     }
  //     break;
  //   }
  //   case "customer.subscription.updated": {
  //     const sub = event.data.object as Stripe.Subscription;
  //     const userId = sub.metadata?.user_id;
  //     const isActive = sub.status === "active" || sub.status === "trialing";
  //     if (userId) {
  //       await supabase
  //         .from("profiles")
  //         .update({ plan_tier: isActive ? "pro" : "free" })
  //         .eq("id", userId);
  //     }
  //     break;
  //   }
  //   case "customer.subscription.deleted": {
  //     const sub = event.data.object as Stripe.Subscription;
  //     const userId = sub.metadata?.user_id;
  //     if (userId) {
  //       await supabase
  //         .from("profiles")
  //         .update({ plan_tier: "free" })
  //         .eq("id", userId);
  //     }
  //     break;
  //   }
  // }
  //
  // return Response.json({ received: true });
  // -------------------------------------------------

  return Response.json({ error: "Stripe webhook handler not yet activated" }, { status: 503 });
}
