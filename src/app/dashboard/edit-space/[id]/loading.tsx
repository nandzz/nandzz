export default function EditSpaceLoading() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="h-8 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-56 rounded bg-muted animate-pulse" />
        </div>

        {/* Form fields */}
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
            </div>
          ))}

          {/* Textarea */}
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            <div className="h-32 w-full rounded-md bg-muted animate-pulse" />
          </div>

          {/* Submit */}
          <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
