"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        Failed to load your dashboard
      </h2>
      <p className="text-muted-foreground max-w-sm mb-6">
        Something went wrong loading your spaces. Please try again.
      </p>
      <Button
        onClick={reset}
      >
        Try again
      </Button>
    </div>
  );
}
