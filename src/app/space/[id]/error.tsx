"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function SpaceError({
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
      <h2 className="text-xl font-semibold mb-2">Failed to load this space</h2>
      <p className="text-muted-foreground max-w-sm mb-6">
        Something went wrong. The space may not exist or there was a server
        error.
      </p>
      <div className="flex gap-3">
        <Button
          onClick={reset}
        >
          Try again
        </Button>
        <Link href="/explore">
          <Button variant="outline" className="border-border/60">
            Browse Spaces
          </Button>
        </Link>
      </div>
    </div>
  );
}
