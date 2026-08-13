"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadAiStubHtml } from "@/lib/spaces/ai-stub-html";
import { useLanguage } from "@/contexts/LanguageContext";
import { ContentBuilderShell } from "./ContentBuilderShell";
import { useContentBuilderForm } from "./useContentBuilderForm";
import type { BuilderFieldsProps } from "./types";

/**
 * AI Generated content: title-only at creation time. A minimal placeholder
 * HTML page is uploaded so the space is immediately viewable; the user then
 * uses the AI Edit assistant (HtmlSpaceEditor) to actually build the page.
 */
export function AiBuilder({ space, collectionId }: BuilderFieldsProps) {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const validate = (): string | null => null; // title-only — shared checks cover it

  const buildTypePayload = async ({ userId, title }: { userId: string; title: string }) => {
    let html_url = space?.html_url || null;
    if (!space?.html_url) {
      html_url = await uploadAiStubHtml(supabase, userId, title);
    }
    return {
      content_type: "ai",
      html_url,
      url: null,
      pdf_url: null,
      image_url: null,
      video_url: null,
      markdown_content: null,
    };
  };

  const form = useContentBuilderForm({
    contentType: "ai",
    space,
    collectionId,
    validate,
    buildTypePayload,
  });

  const [descBefore, descAfter] = t.contentBuilder.aiAfterCreateDesc.split("{aiEdit}");

  return (
    <ContentBuilderShell contentType="ai" space={space} form={form}>
      <div className="flex gap-3 rounded-xl border border-violet-300/60 dark:border-violet-700/50 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-4">
        <Sparkles className="h-5 w-5 shrink-0 text-violet-500 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">{t.contentBuilder.aiAfterCreateTitle}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {descBefore}
            <span className="font-medium text-foreground">{t.aiAssistant.buttonLabel}</span>
            {descAfter}
          </p>
        </div>
      </div>
    </ContentBuilderShell>
  );
}
