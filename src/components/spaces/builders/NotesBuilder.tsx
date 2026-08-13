"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/contexts/LanguageContext";
import { ContentBuilderShell } from "./ContentBuilderShell";
import { useContentBuilderForm } from "./useContentBuilderForm";
import type { BuilderFieldsProps } from "./types";

const MAX_MARKDOWN_LENGTH = 100_000;

export function NotesBuilder({ space, collectionId }: BuilderFieldsProps) {
  const { t } = useLanguage();
  const [markdownContent, setMarkdownContent] = useState(space?.markdown_content || "");
  const [markdownTab, setMarkdownTab] = useState<"write" | "preview">("write");

  const validate = (): string | null => {
    if (!markdownContent.trim() && !space?.markdown_content) return t.contentBuilder.notesContentRequiredError;
    if (markdownContent.length > MAX_MARKDOWN_LENGTH) {
      return t.contentBuilder.notesContentTooLongError.replace("{max}", MAX_MARKDOWN_LENGTH.toLocaleString());
    }
    return null;
  };

  const buildTypePayload = async () => ({
    content_type: "notes",
    markdown_content: markdownContent.trim() || null,
    url: null,
    html_url: null,
    pdf_url: null,
    image_url: null,
    video_url: null,
  });

  const form = useContentBuilderForm({
    contentType: "notes",
    space,
    collectionId,
    validate,
    buildTypePayload,
  });

  return (
    <ContentBuilderShell contentType="notes" space={space} form={form}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t.contentBuilder.notesContentLabel}</Label>
          <div className="flex rounded-lg border border-border/60 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMarkdownTab("write")}
              className={`px-3 py-1.5 transition-colors ${
                markdownTab === "write" ? "bg-violet-600 text-white" : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.contentBuilder.notesTabWrite}
            </button>
            <button
              type="button"
              onClick={() => setMarkdownTab("preview")}
              className={`px-3 py-1.5 transition-colors ${
                markdownTab === "preview" ? "bg-violet-600 text-white" : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.contentBuilder.notesTabPreview}
            </button>
          </div>
        </div>

        {markdownTab === "write" ? (
          <div className="space-y-1.5">
            <Textarea
              placeholder={t.contentBuilder.notesPlaceholder}
              value={markdownContent}
              onChange={(e) => {
                if (e.target.value.length <= MAX_MARKDOWN_LENGTH) setMarkdownContent(e.target.value);
              }}
              rows={12}
              className="font-mono text-sm bg-muted/50 border-border/60 focus:border-violet-500/50 focus:bg-background transition-colors resize-y"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t.contentBuilder.notesGfmHint}
              </p>
              <span
                className={`text-xs ${
                  markdownContent.length >= MAX_MARKDOWN_LENGTH ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {markdownContent.length.toLocaleString()}/{MAX_MARKDOWN_LENGTH.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="min-h-48 rounded-xl border border-border/60 bg-background px-5 py-4 overflow-auto">
            {markdownContent.trim() ? (
              <div className="prose-sm [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-6 [&_h1:first-child]:mt-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_p]:leading-6 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-violet-600 dark:[&_a]:text-violet-400 [&_a]:underline [&_hr]:border-border [&_hr]:my-4 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:bg-muted [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-sm">
                <Markdown remarkPlugins={[remarkGfm]}>{markdownContent}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.contentBuilder.notesNothingToPreview}</p>
            )}
          </div>
        )}
      </div>
    </ContentBuilderShell>
  );
}
