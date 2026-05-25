import { Compass } from "lucide-react";

export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <Compass className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Explore Spaces</h1>
        </div>
        <p className="mt-2 text-muted-foreground text-lg">
          Discover web apps shared by the community
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 overflow-hidden"
          >
            <div className="aspect-[16/10] bg-muted animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
