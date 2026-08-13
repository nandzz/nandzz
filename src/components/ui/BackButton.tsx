"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// No subscription needed — the history length is read once on the client.
const noopSubscribe = () => () => {};

export function BackButton() {
  const router = useRouter();
  // Only offer "Back" when there's somewhere on our site to go back to. A shared
  // widget link opened directly (new tab / fresh load) has a history length of 1,
  // so the button would either do nothing or bounce the visitor off nandzz — hide
  // it there. In-app navigations grow the history stack past 1. Server snapshot is
  // false so SSR never renders the button, avoiding a hydration mismatch.
  const canGoBack = useSyncExternalStore(
    noopSubscribe,
    () => window.history.length > 1,
    () => false
  );

  if (!canGoBack) return null;

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
