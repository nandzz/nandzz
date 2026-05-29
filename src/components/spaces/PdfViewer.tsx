"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  url: string;
  title: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const proxyUrl = useMemo(
    () => `/api/pdf?url=${encodeURIComponent(url)}`,
    [url]
  );

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto bg-muted/40 flex flex-col items-center py-6 gap-4"
    >
      {containerWidth > 0 && (
        <Document
          file={proxyUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <p className="text-sm text-muted-foreground mt-10">Loading PDF…</p>
          }
          error={
            <div className="flex flex-col items-center gap-2 mt-10">
              <p className="text-sm text-muted-foreground">Failed to render PDF.</p>
              <a
                href={proxyUrl}
                download
                className="text-sm text-violet-600 underline underline-offset-2"
              >
                Download instead
              </a>
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i + 1}
              pageNumber={i + 1}
              width={Math.min(containerWidth - 48, 900)}
              className="shadow-md mb-4 rounded-sm overflow-hidden"
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          ))}
        </Document>
      )}
    </div>
  );
}
