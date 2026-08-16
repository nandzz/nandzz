"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlanEntitlements } from "@/lib/types";

// Free-plan entitlements — the safe default while loading and the fallback when
// the catalog is unseeded. Mirrors FREE_FALLBACK in lib/plan.ts.
export const FREE_ENTITLEMENTS: PlanEntitlements = {
  spaceLimit: 25,
  hasWidgets: false,
  hasMcp: false,
  hasAnalytics: false,
  monthlyCredits: 0,
};

// Client-side entitlement gate for nav chrome. Reads the signed-in user's
// plan pointer and the matching subscription_plans row. Defaults to Free
// (everything locked) until resolved, so paid-only nav never flashes for a
// free/anon user.
export function usePlanEntitlements(): PlanEntitlements {
  const supabase = useMemo(() => createClient(), []);
  const [entitlements, setEntitlements] = useState<PlanEntitlements>(FREE_ENTITLEMENTS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setEntitlements(FREE_ENTITLEMENTS);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_slug")
        .eq("id", user.id)
        .maybeSingle();
      const slug = (profile?.plan_slug ?? "free") as string;
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("has_widgets, has_mcp, has_analytics, space_limit, monthly_credits")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!plan) {
        setEntitlements(FREE_ENTITLEMENTS);
        return;
      }
      setEntitlements({
        spaceLimit: plan.space_limit,
        hasWidgets: !!plan.has_widgets,
        hasMcp: !!plan.has_mcp,
        hasAnalytics: !!plan.has_analytics,
        monthlyCredits: plan.monthly_credits ?? 0,
      });
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return entitlements;
}
