"use client";

import dynamic from "next/dynamic";

const PdfViewer = dynamic(
  () => import("./PdfViewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading PDF…</p>
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
