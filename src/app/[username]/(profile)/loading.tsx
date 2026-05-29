export default function ProfileLoading() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background placeholder */}
      <div className="h-48 w-full bg-muted animate-pulse" />

      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Profile header skeleton */}
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-20 w-20 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-7 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded bg-muted animate-pulse" />
            <div className="flex gap-2 pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="mt-12">
          <div className="flex gap-4 border-b border-border/60 mb-8">
            <div className="h-8 w-20 rounded bg-muted animate-pulse" />
            <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          </div>

          {/* Space grid skeleton */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
                <div className="aspect-[16/10] bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
