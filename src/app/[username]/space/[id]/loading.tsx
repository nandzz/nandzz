import { Loader2 } from "lucide-react";

export default function SpaceLoading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Top bar */}
      <div className="border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-px bg-border" />
            <div className="h-5 w-52 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content — matches the full-height iframe area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Loading space…</p>
      </div>
    </div>
  );
}
