import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PricingClient } from "./PricingClient";
import { pricingFaqs } from "./faqs";
import type { CreditPack, SubscriptionPlan } from "@/lib/types";
import { getServerTranslations } from "@/lib/i18n/server";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: pricingFaqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PricingClient
        plans={(plans ?? []) as SubscriptionPlan[]}
        packs={(packs ?? []) as CreditPack[]}
      />
    </>
  );
}
