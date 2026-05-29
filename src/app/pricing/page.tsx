import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — Nandzz",
  description:
    "Start free with 5 Spaces. Upgrade to Pro for unlimited Spaces, private spaces, and more — $9/month or $79/year.",
  openGraph: {
    title: "Simple, transparent pricing — Nandzz",
    description:
      "Start free with 5 Spaces. Upgrade to Pro for unlimited Spaces, private spaces, and more.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pricing — Nandzz",
    description: "Start free. Upgrade to Pro for $9/month or $79/year.",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
