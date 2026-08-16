import { PageShell } from "@/components/layout/PageShell";

export default function BookingsLoading() {
  return (
    <PageShell width="content">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        <div>
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-5 w-72 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 h-8 w-56 rounded-lg bg-muted animate-pulse" />

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                <div className="h-3 w-56 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="h-7 w-20 rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
