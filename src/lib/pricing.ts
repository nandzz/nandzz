import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreditPack, SubscriptionPlan } from "@/lib/types";

// Shared read of the public pricing catalog (active plans + credit packs).
// Consumed by the pricing page's structured data, the homepage SoftwareApplication
// offers, and the machine-readable /pricing.md route so they never drift apart.
export async function getPublicPricing(): Promise<{
  plans: SubscriptionPlan[];
  packs: CreditPack[];
}> {
  try {
    const admin = createAdminClient();
    const [{ data: plans }, { data: packs }] = await Promise.all([
      admin
        .from("subscription_plans")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("credit_packs")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);
    return {
      plans: (plans ?? []) as SubscriptionPlan[],
      packs: (packs ?? []) as CreditPack[],
    };
  } catch {
    return { plans: [], packs: [] };
  }
}
