export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerTranslations, getCurrentLocale } from "@/lib/i18n/server";
import { PageShell } from "@/components/layout/PageShell";
import { BookingsList } from "@/components/bookings/BookingsList";
import { fetchBookerBookings, hasAnyBookerBookings } from "@/lib/bookings/server";

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [t, locale] = await Promise.all([getServerTranslations(), getCurrentLocale()]);

  // Server request time — the stable "now" anchor the upcoming/past filter
  // buckets against, so it doesn't drift as the client re-renders or paginates.
  // This is a server component that runs once per request, so the impure call
  // is fine.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // First page of the default (upcoming) filter, plus a cheap existence check
  // that drives the global empty state independently of the filter buckets.
  // Subsequent pages / other filters load through /api/bookings.
  const admin = createAdminClient();
  const [{ bookings, hasMore }, hasAny] = await Promise.all([
    fetchBookerBookings(admin, user.id, "upcoming", now, 0),
    hasAnyBookerBookings(admin, user.id),
  ]);

  return (
    <PageShell width="content">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <CalendarCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.booking.myBookingsTitle}</h1>
          <p className="mt-1 text-muted-foreground">{t.booking.myBookingsSubtitle}</p>
        </div>
      </div>

      <BookingsList
        initialBookings={bookings}
        initialHasMore={hasMore}
        hasAnyBookings={hasAny}
        now={now}
        locale={locale}
      />
    </PageShell>
  );
}
