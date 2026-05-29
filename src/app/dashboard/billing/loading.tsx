export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Current plan card */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-56 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
          </div>
        </div>

        {/* Pro upgrade card */}
        <div className="rounded-2xl border border-border/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
