"use client";

import { Dialog } from "@/components/ui/dialog";
import { AuthForm, type AuthResult } from "./AuthForm";

// The app-wide auth modal: the same `AuthForm` used on `/login`, presented in a
// Dialog for mid-flow sign-in/sign-up (booking widget today, anywhere else
// tomorrow). Callers react to the outcome via `onSuccess`; email/password
// resolves in place, while Google redirects to `googleRedirectTo` and returns
// the visitor to that page already signed in.
export function AuthModal({
  open,
  onClose,
  onSuccess,
  onGoogleRedirect,
  subtitle,
  defaultMode,
  googleRedirectTo,
  ctaLabel,
  initialDisplayName,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: AuthResult) => void;
  onGoogleRedirect?: () => void;
  subtitle?: string;
  defaultMode?: "login" | "signup" | "setup";
  googleRedirectTo?: string;
  ctaLabel?: string;
  initialDisplayName?: string;
  // When false, the visitor can't dismiss the modal — used for the post-OAuth
  // username step, which must be completed before continuing.
  dismissable?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} dismissable={dismissable}>
      <AuthForm
        variant="embedded"
        onSuccess={onSuccess}
        onGoogleRedirect={onGoogleRedirect}
        subtitle={subtitle}
        defaultMode={defaultMode}
        googleRedirectTo={googleRedirectTo}
        ctaLabel={ctaLabel}
        initialDisplayName={initialDisplayName}
      />
    </Dialog>
  );
}
