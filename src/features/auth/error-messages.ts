import type { Translations } from "@/lib/i18n/translations";

/**
 * Maps a raw backend/auth error to safe, LOCALIZED user copy.
 *
 * Raw Supabase `AuthError` / `PostgrestError` / thrown-`Error` / fetch messages
 * must NEVER be shown to the user — they leak internals (rate-limit windows,
 * "Invalid login credentials", DB hints) and are always English. Every auth
 * surface routes its error through this so the user only ever sees `t.authErrors`.
 *
 * The raw message is matched by substring against known Supabase phrasings and
 * bucketed into a stable localized key; anything unrecognized falls back to the
 * generic message (never the raw text).
 */
export function mapAuthError(
  raw: string | null | undefined,
  t: Translations
): string {
  const m = (raw ?? "").toLowerCase();
  if (!m) return t.authErrors.generic;

  // Rate limiting / throttling (e.g. "email rate limit exceeded",
  // "For security purposes, you can only request this after 51 seconds",
  // "Request rate limit reached", "over_email_send_rate_limit").
  if (
    m.includes("rate limit") ||
    m.includes("rate_limit") ||
    m.includes("too many") ||
    m.includes("for security purposes") ||
    m.includes("you can only request this after")
  ) {
    return t.authErrors.rateLimit;
  }

  // Bad email/password on sign-in.
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials") ||
    m.includes("invalid email or password")
  ) {
    return t.authErrors.invalidCredentials;
  }

  // Email already has an account. In an auth context, any "already …"
  // (registered / exists / in use / taken) means the address is taken.
  if (m.includes("already") || m.includes("email_exists") || m.includes("user_exists")) {
    return t.authErrors.emailInUse;
  }

  // Account exists but the email hasn't been confirmed yet.
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return t.authErrors.emailNotConfirmed;
  }

  // OTP / token expired or invalid (phone verification, magic links).
  if (
    m.includes("token has expired") ||
    m.includes("otp_expired") ||
    m.includes("invalid otp") ||
    (m.includes("token") && (m.includes("expired") || m.includes("invalid")))
  ) {
    return t.authErrors.otpInvalid;
  }

  // Password too weak / too short.
  if (
    m.includes("password should be at least") ||
    m.includes("password is too short") ||
    m.includes("weak_password") ||
    m.includes("password should contain")
  ) {
    return t.authErrors.weakPassword;
  }

  // Network / transport failures.
  if (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("networkerror") ||
    m.includes("load failed")
  ) {
    return t.authErrors.network;
  }

  return t.authErrors.generic;
}
