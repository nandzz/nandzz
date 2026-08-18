import { createClient } from "@/lib/supabase/client";

// Client-side Supabase Auth wrappers for the auth feature's forms.
//
// Every call here mutates or reads the *live browser session* — the same
// session the layout chrome observes via `onAuthStateChange`
// (features/analytics/auth.ts). Converting sign-in / sign-up / sign-out / OTP /
// password-update to Server Actions would set cookies server-side without
// notifying the browser client, so the reactive chrome would not update until a
// hard reload — a behavior change. These therefore stay client-side and, like
// `features/analytics/auth.ts`, live OUTSIDE `components/` so the
// `no-restricted-imports` guardrail (no `@/lib/supabase/*` under
// `features/*/components/**`) is satisfied. Components consume these helpers and
// never touch `@/lib/supabase/*` directly.
//
// Pure data writes (e.g. the setup-username profile claim) are NOT here — those
// go through a zod-validated Server Action in `actions/`.

type AuthError = { message: string };

/** Email + password sign-in against the live browser session. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? { message: error.message } : null };
}

/** Email + password sign-up, carrying username/display_name metadata. */
export async function signUpWithMetadata(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username,
        display_name: input.displayName,
      },
    },
  });
  return { error: error ? { message: error.message } : null };
}

/** Google OAuth redirect flow — inherently browser-side. */
export async function signInWithGoogle(
  redirectTo: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return { error: error ? { message: error.message } : null };
}

/** Sends the password-reset email with the given callback redirect. */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { error: error ? { message: error.message } : null };
}

/** Updates the signed-in user's password on the live session. */
export async function updateUserPassword(
  password: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? { message: error.message } : null };
}

/** Sets/updates the signed-in user's phone (triggers an OTP send). */
export async function updateUserPhone(
  phone: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ phone });
  return { error: error ? { message: error.message } : null };
}

/** Verifies a phone-change OTP against the live session. */
export async function verifyPhoneOtp(
  phone: string,
  token: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change",
  });
  return { error: error ? { message: error.message } : null };
}

/** Whether the browser currently holds an active session (reset-password guard). */
export async function hasActiveSession(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session !== null;
}

/** Current signed-in user's phone state, or null when there is no user. */
export async function getPhoneInfo(): Promise<{
  phone: string | null;
  phoneConfirmed: boolean;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    phone: user.phone ?? null,
    phoneConfirmed: Boolean(user.phone_confirmed_at),
  };
}

/** Signs the current user out of the browser session. */
export async function signOutUser(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
