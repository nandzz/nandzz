import { PageShell } from "@/components/layout/PageShell";

export default function FollowingLoading() {
  return (
    <PageShell width="content">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        <div>
          <div className="h-8 w-40 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-5 w-56 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <ul className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
