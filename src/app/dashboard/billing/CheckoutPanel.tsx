"use client";

import { useState } from "react";
import { CreditCard, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRICES = {
  monthly: { display: "$9", label: "/month", total: "$9/month" },
  annual: { display: "$79", label: "/year", total: "$79/year (~$6.58/mo)" },
};

export function CheckoutPanel({ billingCycle }: { billingCycle: "monthly" | "annual" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = PRICES[billingCycle];

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing: billingCycle }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <CreditCard className="h-5 w-5 text-violet-500" />
        <h2 className="font-semibold">Complete your upgrade</h2>
      </div>

      {/* Order summary */}
      <div className="rounded-xl bg-muted/50 border border-border/40 p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Nandzz Pro</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {billingCycle === "annual" ? "Annual billing — 2 months free" : "Monthly billing"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold">{price.display}</span>
            <span className="text-sm text-muted-foreground">{price.label}</span>
          </div>
        </div>
        {billingCycle === "annual" && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              You save $29/year compared to monthly billing
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 px-3 py-2.5 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-400">{error}</p>
        </div>
      )}

      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full h-11"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Redirecting to Stripe...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Pay {price.total} — Secure Checkout
          </>
        )}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        You will be redirected to Stripe to complete payment. Cancel anytime.
      </p>
    </div>
  );
}
