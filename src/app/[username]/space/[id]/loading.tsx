export default function SpaceLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-px bg-border" />
            <div className="h-5 w-52 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-16 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 bg-muted/50 animate-pulse" />
    </div>
  );
}
