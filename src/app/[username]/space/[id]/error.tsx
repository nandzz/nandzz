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
      <h2 className="text-xl font-semibold mb-2">Failed to load space</h2>
      <p className="text-muted-foreground max-w-sm mb-6">
        This space could not be loaded. It may have been removed or is temporarily unavailable.
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={reset}
        >
          Try again
        </Button>
        <Link href="/">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
