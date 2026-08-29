import type { WidgetBooking } from "@/lib/types";
import type { WidgetOverviewData } from "@/features/booking/components/calendar/WidgetOverview";
import { buildPeriodBuckets, type StatsPeriod } from "@/lib/period";

// Overview aggregation for the widget dashboard. A pure function over a bounded
// window of bookings so it can run server-side (the /dashboard route + loader,
// via features/booking/dashboardData) with no per-row payload crossing the wire.
// The Bookings and Customers tabs no longer aggregate in the client — they read
// windowed rows / the widget_customers_summary RPC respectively.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function buildOverview(
  bookings: WidgetBooking[],
  timezone: string,
  currencySymbol: string,
  shareUrl: string | null,
  locale: string,
  period: StatsPeriod = "month"
): WidgetOverviewData {
  const now = Date.now();
  const confirmed = bookings.filter((b) => b.status === "confirmed");

  // "Next 7 days" is a fixed live window by definition (it says so on the
  // tile) — it stays put regardless of which period is selected.
  const in7 = now + WEEK_MS;
  const next7 = confirmed.filter((b) => {
    const t = new Date(b.starts_at).getTime();
    return t >= now && t < in7;
  }).length;

  // Booking volume trend, bucketed by the selected period (day/week/month
  // granularity), with one extra bucket ahead since bookings can be forward-dated.
  const buckets = buildPeriodBuckets(period, locale, { includeFuture: true });
  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;
  const trend = buckets.map((bucket) => {
    const count = confirmed.filter((b) => {
      const t = new Date(b.starts_at).getTime();
      return t >= bucket.start && t < bucket.end;
    }).length;
    return { label: bucket.label, count, isFuture: bucket.isFuture };
  });

  // Everything below shares the trend chart's start–end window, so the KPI
  // tiles and service breakdown move together with the period selector.
  const inRange = confirmed.filter((b) => {
    const t = new Date(b.starts_at).getTime();
    return t >= rangeStart && t < rangeEnd;
  });
  const upcomingCount = inRange.filter((b) => new Date(b.starts_at).getTime() >= now).length;
  const revenueCents = inRange.reduce((sum, b) => sum + (b.price_cents ?? 0), 0);
  const cancelled = bookings.filter((b) => {
    if (b.status !== "cancelled") return false;
    const t = new Date(b.starts_at).getTime();
    return t >= rangeStart && t < rangeEnd;
  }).length;

  // Bookings by service.
  const byService = new Map<string, { count: number; revenueCents: number }>();
  for (const b of inRange) {
    const cur = byService.get(b.service_name) ?? { count: 0, revenueCents: 0 };
    cur.count += 1;
    cur.revenueCents += b.price_cents ?? 0;
    byService.set(b.service_name, cur);
  }
  const services = [...byService.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count);

  return {
    timezone,
    currencySymbol,
    totals: {
      upcoming: upcomingCount,
      confirmedInPeriod: inRange.length,
      revenueCents,
      next7,
      cancelled,
    },
    trend,
    services,
    shareUrl,
  };
}
