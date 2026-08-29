import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { formatBookingTimeRelative } from "../emails.ts";
import { reminderIsRedundant } from "../types.ts";

// A fixed "now" so relative-day math is deterministic: 2026-08-26 10:00 UTC.
const NOW = new Date("2026-08-26T10:00:00Z");

Deno.test("relative date — same day renders 'Today' + time (en)", () => {
  const out = formatBookingTimeRelative("2026-08-26T15:00:00Z", "UTC", "en", NOW);
  assertStringIncludes(out, "Today");
  assertStringIncludes(out, "at");
  assertStringIncludes(out, "3:00"); // 15:00 UTC
});

Deno.test("relative date — next day renders 'Tomorrow' + time (en)", () => {
  const out = formatBookingTimeRelative("2026-08-27T09:00:00Z", "UTC", "en", NOW);
  assertStringIncludes(out, "Tomorrow");
  assertStringIncludes(out, "9:00");
});

Deno.test("relative date — beyond tomorrow falls back to the absolute date", () => {
  const out = formatBookingTimeRelative("2026-08-29T09:00:00Z", "UTC", "en", NOW);
  assert(!out.includes("Today"));
  assert(!out.includes("Tomorrow"));
  assertStringIncludes(out, "August"); // full weekday/month absolute form
  assertStringIncludes(out, "2026");
});

Deno.test("relative date — localized day words (pt / fr / de / it / es)", () => {
  const start = "2026-08-27T09:00:00Z"; // tomorrow
  assertStringIncludes(formatBookingTimeRelative(start, "UTC", "pt", NOW), "Amanhã");
  assertStringIncludes(formatBookingTimeRelative(start, "UTC", "fr", NOW), "Demain");
  assertStringIncludes(formatBookingTimeRelative(start, "UTC", "de", NOW), "Morgen");
  assertStringIncludes(formatBookingTimeRelative(start, "UTC", "it", NOW), "Domani");
  assertStringIncludes(formatBookingTimeRelative(start, "UTC", "es", NOW), "Mañana");
});

Deno.test("relative date — localized 'today' word (pt)", () => {
  const out = formatBookingTimeRelative("2026-08-26T18:00:00Z", "UTC", "pt", NOW);
  assertStringIncludes(out, "Hoje");
});

Deno.test("relative date — day offset is computed in the recipient timezone", () => {
  // 2026-08-26 23:00Z is 19:00 on Aug 26 in New York (EDT = UTC-4).
  const now = new Date("2026-08-26T23:00:00Z");
  // Appointment 2026-08-27 02:00Z is 22:00 on Aug 26 in New York — still "today"
  // locally, even though it's the next calendar day in UTC.
  const out = formatBookingTimeRelative("2026-08-27T02:00:00Z", "America/New_York", "en", now);
  assertStringIncludes(out, "Today");
});

Deno.test("relative date — invalid timezone degrades without throwing", () => {
  const out = formatBookingTimeRelative("2026-08-27T09:00:00Z", "Not/AZone", "en", NOW);
  assert(out.length > 0);
});

// ── Reminder redundancy (same rule the cron applies in SQL) ────────────────────

Deno.test("reminder — suppressed for a same-day booking", () => {
  // Created and starting on the same day, ~5h apart.
  assertEquals(
    reminderIsRedundant("2026-08-26T10:00:00Z", "2026-08-26T15:00:00Z"),
    true,
  );
});

Deno.test("reminder — suppressed when booked <25h before start", () => {
  // 24h lead: confirmation already covers it.
  assertEquals(
    reminderIsRedundant("2026-08-25T15:00:00Z", "2026-08-26T15:00:00Z"),
    true,
  );
});

Deno.test("reminder — sent when booked well in advance (>25h)", () => {
  // 29h lead: a day-before reminder is worthwhile.
  assertEquals(
    reminderIsRedundant("2026-08-25T10:00:00Z", "2026-08-26T15:00:00Z"),
    false,
  );
});

Deno.test("reminder — the 25h boundary is inclusive of sending", () => {
  // Exactly 25h lead is NOT redundant (>= the lead window ⇒ remind).
  assertEquals(
    reminderIsRedundant("2026-08-25T14:00:00Z", "2026-08-26T15:00:00Z"),
    false,
  );
});

Deno.test("reminder — malformed dates never suppress (fail open to the cron)", () => {
  assertEquals(reminderIsRedundant("nonsense", "2026-08-26T15:00:00Z"), false);
});
