import type { BookingRowData } from "@/features/booking/components/calendar/BookingRow";

// Client-safe shapes for the windowed dashboard data. Kept out of
// `dashboardData.ts` (which is `server-only`) so Client Components can import
// the types without pulling the server read layer into the browser bundle.

export type BookingsFilter = "all" | "upcoming" | "past" | "cancelled";

export type TodaySnapshot = {
  count: number;
  done: number;
  revenueCents: number;
  nextStartsAt: string | null;
};

export type CalendarData = {
  monthKey: string; // "YYYY-MM" the rows belong to
  bookings: BookingRowData[];
  today: TodaySnapshot;
};

export type ListData = {
  bookings: BookingRowData[];
  total: number;
};
