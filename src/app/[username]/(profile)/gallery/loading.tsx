import { PageShell } from "@/components/layout/PageShell";

export default function ProfileGalleryLoading() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <PageShell width="wide">
        <div className="mb-8">
          <div className="mb-4 h-4 w-24 rounded bg-muted animate-pulse" />
        </div>

        <div className="mb-4 h-6 w-32 rounded bg-muted animate-pulse" />

        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md sm:rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </PageShell>
    </div>
  );
}
