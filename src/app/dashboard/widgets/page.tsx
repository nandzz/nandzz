export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getUserIdFromClaims } from "@/lib/supabase/server";
import { getAccountType } from "@/lib/account/server";
import { getOwnerWidgets, getWidgetCatalog } from "@/features/booking/server";
import { getUserEntitlements, getSubscriptionPlans } from "@/lib/plan";
import { AddWidgetButton, renderWidgetIcon } from "@/features/booking";
import { Blocks, Check, Settings } from "lucide-react";
import { getServerTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/layout/PageShell";
import { WidgetPaywall } from "./WidgetPaywall";

export default async function WidgetsDashboardPage() {
  const supabase = await createClient();
  const userId = await getUserIdFromClaims(supabase);
  if (!userId) redirect("/login");

  // Business-only section: personal accounts can't reach it by direct URL.
  if ((await getAccountType(supabase, userId)) !== "business") redirect("/dashboard/feed");

  const [widgets, catalog, entitlements, plans, t] = await Promise.all([
    getOwnerWidgets(userId),
    getWidgetCatalog(),
    getUserEntitlements(userId),
    getSubscriptionPlans(),
    getServerTranslations(),
  ]);

  const ownedCatalogIds = new Set(widgets.map((w) => w.catalog_id));
  const available = catalog.filter((c) => !ownedCatalogIds.has(c.id));
  // Plans that unlock widgets — surfaced on the locked cards and in the modal.
  const widgetPlans = plans.filter((p) => p.has_widgets);

  return (
    <PageShell width="content">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <Blocks className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.booking.widgetsPageTitle}</h1>
          <p className="mt-1 text-muted-foreground">{t.booking.widgetsPageSubtitle}</p>
        </div>
      </div>

      {!entitlements.hasWidgets ? (
        /* Locked: the catalog is always shown, but each card opens the
           subscription modal instead of adding the widget. */
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t.booking.addWidgetSection}</h2>
          <WidgetPaywall catalog={catalog} widgetPlans={widgetPlans} />
        </div>
      ) : (
        <>
          {/* Your widgets */}
          {widgets.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t.booking.yourWidgetsSection}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {widgets.map((w) => (
                  <div
                    key={w.id}
                    className="group relative rounded-2xl border border-border bg-background p-5 transition hover:border-emerald-400 hover:shadow-sm"
                  >
                    {/* Stretched link — the whole card opens the widget; the gear
                        (above, at a higher z-index) opens widget-level settings instead. */}
                    <Link
                      href={`/dashboard/widgets/${w.id}`}
                      className="absolute inset-0 z-0 rounded-2xl"
                      aria-label={w.catalog.name}
                    />
                    <div className="pointer-events-none relative z-[1] flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                          {renderWidgetIcon(w.catalog.icon, "h-4 w-4 text-emerald-600 dark:text-emerald-400")}
                        </div>
                        <div>
                          <p className="font-semibold">{w.catalog.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.enabled ? t.booking.shownOnProfile : t.booking.hiddenStatus}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/widgets/${w.id}/settings`}
                        aria-label={t.booking.widgetSettingsTitle}
                        className="pointer-events-auto relative z-10 rounded-lg p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="pointer-events-none relative z-[1] mt-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Check className="h-3 w-3" /> {w.enabled ? t.booking.shownOnProfile : t.booking.hiddenStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add a widget — unlocked by the plan, no per-widget checkout. */}
          {available.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t.booking.addWidgetSection}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {available.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-border bg-background p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        {renderWidgetIcon(c.icon, "h-4 w-4 text-muted-foreground")}
                      </div>
                      <p className="font-semibold">{c.name}</p>
                    </div>
                    {c.description && <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>}
                    <div className="mt-4 flex items-center justify-end">
                      <AddWidgetButton catalogId={c.id} label={t.booking.addWidgetButton} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {widgets.length === 0 && available.length === 0 && (
            <p className="text-muted-foreground">{t.booking.noWidgetsAvailable}</p>
          )}
        </>
      )}
    </PageShell>
  );
}
