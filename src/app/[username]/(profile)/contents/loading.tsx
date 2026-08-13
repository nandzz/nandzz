import { PageShell } from "@/components/layout/PageShell";

export default function ProfileContentsLoading() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <PageShell width="wide">
        <div className="mb-8">
          <div className="mb-4 h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    </div>
  );
}
