"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Gauge, ArrowUpRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  instanceId: string;
  hasAccess: boolean;
  initialEnabled: boolean;
  /** Credits consumed from the plan allowance in the current billing period. */
  creditsUsed: number;
  /** Catalog's monthly_credit_limit — credits included per period. 0/unset = unlimited. */
  creditLimit: number;
  /** `/[username]/agent` when live (has_access && enabled), else null. */
  previewUrl: string | null;
}

// Lean management surface for the agent widget instance: subscription
// status, the on/off profile-visibility toggle, and this period's credit
// usage against the plan allowance. Knowledge (documents, suggested questions)
// is still authored at /dashboard/agent (AgentStudio) — deliberately not
// duplicated here, just linked to.
export function AgentWidgetWorkspace({
  instanceId,
  hasAccess,
  initialEnabled,
  creditsUsed,
  creditLimit,
  previewUrl,
}: Props) {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(next: boolean) {
    const prev = enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/widgets/instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setEnabled(prev);
        setError(data?.error ?? t.booking.errorCouldNotSave);
        return;
      }
    } catch {
      setEnabled(prev);
      setError(t.booking.errorCouldNotSave);
    } finally {
      setSaving(false);
    }
  }

  const capped = creditLimit > 0;
  const pct = capped ? Math.min(100, Math.round((creditsUsed / creditLimit) * 100)) : 0;
  const nearCap = capped && pct >= 90;

  return (
    <div className="space-y-6">
      {/* Billing */}
      <section className="rounded-2xl border border-border bg-background p-5">
        {hasAccess ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" /> {t.booking.billingActive}
            </span>
            {/* POST → Stripe billing portal (303 redirect). */}
            <form action="/api/stripe/portal" method="post">
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                {t.booking.manageSubscription}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 dark:text-orange-300">
              <CircleAlert className="h-4 w-4" /> {t.plan.widgetsLocked}
            </span>
            <Link
              href="/dashboard/credits"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t.plan.upgradeToStarter}
            </Link>
          </div>
        )}
      </section>

      {/* Visibility */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{t.booking.showOnProfile}</p>
            <p className="text-sm text-muted-foreground">
              {hasAccess
                ? t.agent.widgetShowOnProfileDesc
                : t.booking.showOnProfileDescInactive}
            </p>
          </div>
          <Switch checked={enabled} disabled={saving || !hasAccess} onCheckedChange={handleToggle} />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline"
          >
            {t.agent.widgetPreviewLink} <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </section>

      {/* Usage */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold">{t.agent.widgetUsageTitle}</h3>
        </div>
        {capped ? (
          <>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium tabular-nums">
                {t.agent.widgetUsageCredits
                  .replace("{used}", creditsUsed.toLocaleString())
                  .replace("{limit}", creditLimit.toLocaleString())}
              </span>
              <span className={`text-xs ${nearCap ? "text-orange-600" : "text-muted-foreground"}`}>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${nearCap ? "bg-orange-500" : "bg-violet-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct >= 100 && (
              <p className="mt-2 text-xs text-orange-600">
                {t.agent.widgetUsageLimitReached}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.agent.widgetUsageNoCap.replace("{used}", creditsUsed.toLocaleString())}
          </p>
        )}
      </section>

      {/* Knowledge */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t.agent.knowledge}</p>
            <p className="text-sm text-muted-foreground">
              {t.agent.widgetKnowledgeDesc}
            </p>
          </div>
          <Link
            href="/dashboard/agent"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {t.agent.widgetOpenStudio}
          </Link>
        </div>
      </section>
    </div>
  );
}
