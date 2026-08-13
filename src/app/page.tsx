import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";
import { HomeClient } from "./HomeClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations();
  return {
    title: t.meta.rootTitle,
    description: t.meta.rootDescription,
    alternates: {
      canonical: "https://nandzz.com",
    },
  };
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://nandzz.com/#website",
      url: "https://nandzz.com",
      name: "nandzz",
      description: "A branded page plus widgets — booking, content, and pools — for businesses and pros who want to be found and booked.",
    },
    {
      "@type": "Organization",
      "@id": "https://nandzz.com/#organization",
      name: "nandzz",
      url: "https://nandzz.com",
      description:
        "Nandzz gives businesses, solo pros, and institutions a branded page and the widgets to run it — take bookings, publish content, and build pools.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://nandzz.com/#app",
      name: "nandzz",
      applicationCategory: "WebApplication",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          description: "5 pieces of content, public sharing, community profile",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "9",
          priceCurrency: "USD",
          description: "Unlimited Content, private content, Pro badge, HTML editor",
        },
      ],
    },
  ],
};

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    redirect(profile?.username ? `/${profile.username}` : "/dashboard/contents");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HomeClient />
    </>
  );
}
