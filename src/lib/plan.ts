import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PlanEntitlements,
  PlanSlug,
  SubscriptionPlan,
  UserPlan,
} from "@/lib/types";

// Hardcoded Free-plan fallback so gating stays correct even before the
// `subscription_plans` catalog is seeded, or when a profile points at a slug
// that has no matching (active) plan row. Mirrors the product spec:
// 25 spaces, no widgets, no MCP, no analytics, zero AI credits.
const FREE_FALLBACK: { name: string; entitlements: PlanEntitlements } = {
  name: "Free",
  entitlements: {
    spaceLimit: 25,
    hasWidgets: false,
    hasMcp: false,
    hasAnalytics: false,
    monthlyCredits: 0,
  },
};

function entitlementsFromPlan(plan: SubscriptionPlan): PlanEntitlements {
  return {
    spaceLimit: plan.space_limit,
    hasWidgets: plan.has_widgets,
    hasMcp: plan.has_mcp,
    hasAnalytics: plan.has_analytics,
    monthlyCredits: plan.monthly_credits,
  };
}

type ProfilePlanRow = {
  plan_slug: string | null;
  plan_status: string | null;
  plan_credits: number | null;
  paid_credits: number | null;
  plan_current_period_end: string | null;
};

function resolve(
  profile: ProfilePlanRow | null,
  plan: SubscriptionPlan | null
): UserPlan {
  const slug = (profile?.plan_slug ?? "free") as PlanSlug;
  const entitlements = plan ? entitlementsFromPlan(plan) : FREE_FALLBACK.entitlements;
  const name = plan?.name ?? FREE_FALLBACK.name;
  return {
    slug,
    name,
    status: profile?.plan_status ?? null,
    planCredits: profile?.plan_credits ?? 0,
    paidCredits: profile?.paid_credits ?? 0,
    periodEnd: profile?.plan_current_period_end ?? null,
    entitlements,
  };
}

// Single source of truth for plan gating. Reads the profile's plan pointer and
// looks up the matching `subscription_plans` row. Uses the service-role client
// so it can resolve *any* user's plan (e.g. a profile owner from a public
// surface); callers decide who they're allowed to look up.
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("plan_slug, plan_status, plan_credits, paid_credits, plan_current_period_end")
    .eq("id", userId)
    .maybeSingle();

  const slug = (profile?.plan_slug ?? "free") as PlanSlug;

  const { data: plan } = await admin
    .from("subscription_plans")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return resolve((profile ?? null) as ProfilePlanRow | null, (plan ?? null) as SubscriptionPlan | null);
}

// Cheap helper when only the gating booleans are needed.
export async function getUserEntitlements(userId: string): Promise<PlanEntitlements> {
  const plan = await getUserPlan(userId);
  return plan.entitlements;
}

// The three active plans, ordered — used by the pricing page and plan chooser.
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscription_plans")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as SubscriptionPlan[];
}
