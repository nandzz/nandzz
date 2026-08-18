"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CircleAlert } from "lucide-react";
import { updateWidgetInstance } from "@/features/booking/actions/update-widget-instance";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  instanceId: string;
  hasAccess: boolean;
  initialEnabled: boolean;
}

// Whole-widget settings — plan status and the on/off profile visibility toggle.
// Neither is per-location, so this lives on its own page (reached from the
// widget card's gear icon), separate from a location's dashboard. Each field
// auto-saves on change rather than sharing a Save bar, since there's exactly
// one editable field here (the visibility toggle).
export function WidgetInstanceSettings({ instanceId, hasAccess, initialEnabled }: Props) {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleToggle(next: boolean) {
    const prev = enabled;
    setEnabled(next);
    setSaving(true);
    setStatus(null);
    try {
      const res = await updateWidgetInstance({ instanceId, enabled: next });
      if (!res.ok) {
        setEnabled(prev);
        setStatus({ ok: false, msg: res.message ?? t.booking.errorCouldNotSave });
        return;
      }
      setStatus({ ok: true, msg: t.booking.savedMsg });
    } catch {
      setEnabled(prev);
      setStatus({ ok: false, msg: t.booking.errorCouldNotSave });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ══ Billing ══ */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.booking.sectionBilling}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t.booking.billingHint}</p>
        </div>
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
      </div>

      {/* ══ Visibility ══ */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.booking.sectionVisibility}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t.booking.visibilityHint}</p>
        </div>
        <section className="rounded-2xl border border-border bg-background p-5">
          <label className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{t.booking.showOnProfile}</p>
              <p className="text-sm text-muted-foreground">
                {hasAccess ? t.booking.showOnProfileDescActive : t.booking.showOnProfileDescInactive}
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              disabled={saving}
              onChange={(e) => handleToggle(e.target.checked)}
              className="h-5 w-5 accent-emerald-600"
            />
          </label>
        </section>
      </div>

      {status && (
        <p className={`text-sm ${status.ok ? "text-emerald-600" : "text-red-600"}`}>
          {status.ok && <Check className="mr-1 inline h-4 w-4" />}
          {status.msg}
        </p>
      )}
    </div>
  );
}
