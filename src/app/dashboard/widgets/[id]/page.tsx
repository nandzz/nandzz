export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnerWidgetById } from "@/lib/widgets/server";
import { normalizeCalendarConfig } from "@/lib/widgets/calendar";
import { renderWidgetIcon } from "@/components/widgets/widgetIcon";
import { WidgetWorkspace } from "@/components/widgets/calendar/WidgetWorkspace";
import { AgentWidgetWorkspace } from "@/components/widgets/agent/AgentWidgetWorkspace";
import { LocaleSelect } from "@/components/layout/LocaleSelect";
import { ChevronLeft } from "lucide-react";
import type { WidgetBooking } from "@/lib/types";
import { getServerTranslations, getCurrentLocale } from "@/lib/i18n/server";

const CURRENCY_SYMBOLS: Record<string, string> = { usd: "$", eur: "€", gbp: "£" };

export default async function WidgetStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const widget = await getOwnerWidgetById(user.id, id);
  if (!widget) notFound();

  const slug = widget.catalog.slug;
  if (slug !== "calendar" && slug !== "agent") notFound();

  const admin = createAdminClient();
  const [t, locale, { data: profile }] = await Promise.all([
    getServerTranslations(),
    getCurrentLocale(),
    admin.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);

  const isAgent = slug === "agent";
  const iconBg = isAgent
    ? "bg-violet-100 dark:bg-violet-900/40"
    : "bg-emerald-100 dark:bg-emerald-900/40";
  const iconColor = isAgent
    ? "text-violet-600 dark:text-violet-400"
    : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/dashboard/widgets"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t.booking.allWidgetsLink}
      </Link>

      <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
            {renderWidgetIcon(widget.catalog.icon, `h-5 w-5 ${iconColor}`)}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{widget.catalog.name}</h1>
            <p className="text-sm text-muted-foreground">
              {widget.has_access
                ? widget.enabled
                  ? t.booking.liveOnProfile
                  : t.booking.activeHiddenFromProfile
                : t.booking.inactiveSubscribe}
            </p>
          </div>
        </div>
        <LocaleSelect />
      </div>

      {isAgent ? (
        <AgentWorkspaceLoader
          admin={admin}
          instanceId={widget.id}
          catalogId={widget.catalog_id}
          hasAccess={widget.has_access}
          enabled={widget.enabled}
          creditLimit={widget.catalog.monthly_credit_limit}
          username={profile?.username}
        />
      ) : (
        <CalendarWorkspaceLoader
          admin={admin}
          instanceId={widget.id}
          catalogId={widget.catalog_id}
          hasAccess={widget.has_access}
          enabled={widget.enabled}
          config={widget.config}
          currency={widget.catalog.currency}
          username={profile?.username}
          locale={locale}
        />
      )}
    </div>
  );
}

// Split per-slug so each loader only issues the query its own workspace
// needs (bookings for calendar, usage-period lookup for agent).

async function CalendarWorkspaceLoader({
  admin,
  instanceId,
  catalogId,
  hasAccess,
  enabled,
  config,
  currency,
  username,
  locale,
}: {
  admin: ReturnType<typeof createAdminClient>;
  instanceId: string;
  catalogId: string;
  hasAccess: boolean;
  enabled: boolean;
  config: Record<string, unknown>;
  currency: string;
  username?: string;
  locale: Awaited<ReturnType<typeof getCurrentLocale>>;
}) {
  const { data: bookingRows } = await admin
    .from("widget_bookings")
    .select("*")
    .eq("instance_id", instanceId)
    .order("starts_at", { ascending: true });

  const bookings = (bookingRows ?? []) as WidgetBooking[];
  const normalizedConfig = normalizeCalendarConfig(config);
  const currencySymbol = CURRENCY_SYMBOLS[currency?.toLowerCase()] ?? currency?.toUpperCase() ?? "$";

  const canShare = hasAccess && enabled && !!username;
  const shareUrl = canShare ? `/${username}/widget/${instanceId}` : null;

  return (
    <Suspense>
      <WidgetWorkspace
        instanceId={instanceId}
        catalogId={catalogId}
        hasAccess={hasAccess}
        enabled={enabled}
        config={normalizedConfig}
        allBookings={bookings}
        currencySymbol={currencySymbol}
        shareUrl={shareUrl}
        locale={locale}
      />
    </Suspense>
  );
}

async function AgentWorkspaceLoader({
  admin,
  instanceId,
  catalogId,
  hasAccess,
  enabled,
  creditLimit,
  username,
}: {
  admin: ReturnType<typeof createAdminClient>;
  instanceId: string;
  catalogId: string;
  hasAccess: boolean;
  enabled: boolean;
  creditLimit: number;
  username?: string;
}) {
  // Same billing-period bucket charge_agent_usage/agent_can_serve use, so the
  // number shown here always matches what's actually gating the chat.
  const { data: periodStart } = await admin.rpc("_agent_current_period", {
    p_instance_id: instanceId,
  });

  let creditsUsed = 0;
  if (periodStart) {
    const { data: usageRow } = await admin
      .from("widget_agent_usage")
      .select("credits_used")
      .eq("instance_id", instanceId)
      .eq("period_start", periodStart)
      .maybeSingle();
    creditsUsed = usageRow?.credits_used ?? 0;
  }

  const canPreview = hasAccess && enabled && !!username;
  const previewUrl = canPreview ? `/${username}/agent` : null;

  return (
    <Suspense>
      <AgentWidgetWorkspace
        instanceId={instanceId}
        catalogId={catalogId}
        hasAccess={hasAccess}
        initialEnabled={enabled}
        creditsUsed={creditsUsed}
        creditLimit={creditLimit}
        previewUrl={previewUrl}
      />
    </Suspense>
  );
}
