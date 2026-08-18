"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface IframeLoaderProps {
  src: string;
  title: string;
  sandbox?: string;
}

export function IframeLoader({ src, title, sandbox }: IframeLoaderProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading content…</p>
        </div>
      )}
      <iframe
        src={src}
        title={title}
        sandbox={sandbox}
        className="h-full w-full border-0"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
