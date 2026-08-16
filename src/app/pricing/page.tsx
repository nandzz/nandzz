import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PricingClient } from "./PricingClient";
import type { CreditPack, SubscriptionPlan } from "@/lib/types";
import { getServerTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations();
  return {
    title: t.meta.pricingTitle,
    description: t.meta.pricingDescription,
    openGraph: {
      title: t.meta.pricingTitle,
      description: t.meta.pricingShortDescription,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: t.meta.pricingTitle,
      description: t.meta.pricingShortDescription,
    },
  };
}

export const revalidate = 300;

export default async function PricingPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: packs }] = await Promise.all([
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("credit_packs")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <PricingClient
      plans={(plans ?? []) as SubscriptionPlan[]}
      packs={(packs ?? []) as CreditPack[]}
    />
  );
}
