// Booking email helpers — ported from src/lib/widgets/emails.ts to Deno.
// Time formatting via Intl.DateTimeFormat + a minimal, email-client-safe HTML
// wrapper. The only addition vs the Node original is a `locale` param so the
// rendered date string matches the recipient's language.

import type { Locale } from "./types.ts";

// Map our short locale codes to a BCP-47 tag for Intl formatting.
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  pt: "pt-BR",
  fr: "fr-FR",
  es: "es-ES",
  ja: "ja-JP",
  de: "de-DE",
  it: "it-IT",
};

export function formatBookingTime(
  startsAt: string,
  timezone: string,
  locale: Locale = "en",
): string {
  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(startsAt));
  } catch {
    return new Date(startsAt).toUTCString();
  }
}

// The localized connector between the relative day word and the clock time
// ("Tomorrow ⟨at⟩ 3:00 PM"). Empty where the language reads naturally without
// one (Japanese). Word order stays day-then-time for all supported locales.
const AT_WORD: Record<Locale, string> = {
  en: "at",
  pt: "às",
  fr: "à",
  es: "a las",
  ja: "",
  de: "um",
  it: "alle",
};

// The calendar-day offset of `startsAt` from `reference`, both evaluated in
// `timezone` (so it flips at local midnight, not UTC midnight). 0 = same day,
// 1 = next day, etc.
function calendarDayOffset(startsAt: Date, reference: Date, timezone: string): number {
  const ymd = (d: Date) => {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const [y, m, day] = p.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((ymd(startsAt) - ymd(reference)) / 86_400_000);
}

function capitalize(s: string): string {
  return s ? s[0].toLocaleUpperCase() + s.slice(1) : s;
}

// Like formatBookingTime, but renders "Today"/"Tomorrow" + the clock time (both
// localized) when the appointment falls on the current or next calendar day in
// the recipient's timezone. Anything further out keeps the full absolute date.
// `now` is injectable for testing; it defaults to the wall clock.
export function formatBookingTimeRelative(
  startsAt: string,
  timezone: string,
  locale: Locale = "en",
  now: Date = new Date(),
): string {
  const intl = INTL_LOCALE[locale] ?? "en-US";
  try {
    const when = new Date(startsAt);
    const offset = calendarDayOffset(when, now, timezone);
    if (offset !== 0 && offset !== 1) {
      return formatBookingTime(startsAt, timezone, locale);
    }
    const relDay = capitalize(
      new Intl.RelativeTimeFormat(intl, { numeric: "auto" }).format(offset, "day"),
    );
    const time = new Intl.DateTimeFormat(intl, {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(when);
    return [relDay, AT_WORD[locale], time].filter(Boolean).join(" ");
  } catch {
    return formatBookingTime(startsAt, timezone, locale);
  }
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}
