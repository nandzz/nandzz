import { PageShell } from "@/components/layout/PageShell";

export default function ProfileLinksLoading() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <PageShell width="wide">
        <div className="mb-8">
          <div className="mb-4 h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border/60"
            >
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    </div>
  );
}
