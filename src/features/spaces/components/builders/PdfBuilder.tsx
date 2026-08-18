"use client";

import { useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ContentBuilderShell } from "./ContentBuilderShell";
import { useContentBuilderForm } from "../../hooks/useContentBuilderForm";
import { uploadSpacePdf } from "../../storage";
import { FileDropzone } from "./FileDropzone";
import type { BuilderFieldsProps } from "./types";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

export function PdfBuilder({ space, collectionId }: BuilderFieldsProps) {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const validate = (): string | null => {
    if (!pdfFile && !space?.pdf_url) return t.contentBuilder.pdfFileRequiredError;
    return null;
  };

  const buildTypePayload = async ({ userId }: { userId: string }) => {
    let pdf_url = space?.pdf_url || null;
    if (pdfFile) {
      try {
        pdf_url = await uploadSpacePdf(userId, pdfFile);
      } catch (uploadErr) {
        throw new Error(t.contentBuilder.pdfUploadFailedPrefix + (uploadErr as Error).message);
      }
    }
    return {
      content_type: "pdf",
      pdf_url,
      url: null,
      html_url: null,
      image_url: null,
      video_url: null,
      markdown_content: null,
    };
  };

  const form = useContentBuilderForm({
    contentType: "pdf",
    space,
    collectionId,
    validate,
    buildTypePayload,
  });

  return (
    <ContentBuilderShell contentType="pdf" space={space} form={form}>
      <div className="space-y-4">
        {pdfFile ? (
          <div className="flex items-center gap-3 rounded-xl border border-violet-400/50 bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
            <FileText className="h-5 w-5 shrink-0 text-violet-500" />
            <span className="flex-1 text-sm font-medium text-violet-700 dark:text-violet-300 truncate">
              {pdfFile.name}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              type="button"
              onClick={() => setPdfFile(null)}
              className="rounded-full p-1 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
            >
              <X className="h-4 w-4 text-violet-500" />
            </button>
          </div>
        ) : (
          <FileDropzone
            accept="application/pdf,.pdf"
            maxSizeBytes={MAX_PDF_SIZE}
            maxSizeErrorMessage={t.contentBuilder.pdfMaxSizeError}
            mimeCheck={(file) => file.type === "application/pdf"}
            mimeErrorMessage={t.contentBuilder.pdfMimeError}
            icon={UploadCloud}
            title={t.contentBuilder.pdfDropzoneTitle}
            hint={t.contentBuilder.pdfDropzoneHint}
            onFileSelected={setPdfFile}
            onError={form.setError}
          />
        )}

        {space?.pdf_url && !pdfFile && (
          <p className="text-xs text-muted-foreground">{t.contentBuilder.pdfKeptNotice}</p>
        )}
      </div>
    </ContentBuilderShell>
  );
}
