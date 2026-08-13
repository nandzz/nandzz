import { Palette } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

export default function BrandLoading() {
  return (
    <PageShell width="narrow">
      {/* Header — mirrors dashboard/brand/page.tsx. */}
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <Palette className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
          <div className="mt-2 h-5 w-72 max-w-full rounded bg-muted animate-pulse" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
          <div className="h-16 w-16 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-8 w-32 rounded-md bg-muted animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-24 w-full rounded-lg bg-muted animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        </div>

        <div className="space-y-3">
          <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                <div className="h-9 flex-1 rounded-md bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
      </div>
    </PageShell>
  );
}
