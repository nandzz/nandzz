"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PdfViewer = dynamic(
  () => import("./PdfViewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Loading PDF…</p>
      </div>
    ),
  }
);

interface PdfViewerWrapperProps {
  url: string;
  title: string;
}

export function PdfViewerWrapper({ url, title }: PdfViewerWrapperProps) {
  return <PdfViewer url={url} title={title} />;
}
