"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  detectVideo,
  getYoutubeThumbnail,
  getVimeoThumbnail,
} from "@/components/spaces/VideoEmbed";
import { useLanguage } from "@/contexts/LanguageContext";
import { ContentBuilderShell } from "./ContentBuilderShell";
import { useContentBuilderForm } from "./useContentBuilderForm";
import type { BuilderFieldsProps } from "./types";

const MAX_URL_LENGTH = 500;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Unified Link/Video content (the former "video" and "link"/"url" types merged
 * into one). A single URL field: if the pasted URL is a recognized video
 * (YouTube/Vimeo/Loom) it embeds inline and auto-derives its thumbnail as the
 * preview; otherwise the preview is derived from the page (OG image → screenshot
 * fallback). Either way the space is stored as `content_type: "link"` with the
 * URL in the `url` column — the space page decides embed-vs-iframe at render.
 */
export function LinkBuilder({ space, collectionId }: BuilderFieldsProps) {
  const { t } = useLanguage();
  // Seed from `url`, falling back to `video_url` for un-migrated legacy rows.
  const [url, setUrl] = useState(space?.url || space?.video_url || "");

  const videoInfo = url.trim() ? detectVideo(normalizeUrl(url)) : null;
  const isVideo = !!videoInfo;

  const validate = (): string | null => {
    if (!url.trim()) return t.contentBuilder.linkUrlRequiredError;
    const normalized = normalizeUrl(url);
    if (/^(javascript|data|vbscript):/i.test(normalized)) {
      return t.contentBuilder.linkInvalidSchemeError;
    }
    return null;
  };

  const buildTypePayload = async ({ hasManualPreview }: { hasManualPreview: boolean }) => {
    const finalUrl = normalizeUrl(url);

    // For a video URL, auto-use the platform thumbnail as the preview (unless the
    // user already picked/kept one). YouTube is a pure string transform; Vimeo
    // needs an oEmbed round-trip so only pay for it when there's no manual preview.
    let preview_image_url: string | undefined;
    if (isVideo && !hasManualPreview) {
      const ytThumb = getYoutubeThumbnail(finalUrl);
      if (ytThumb) {
        preview_image_url = ytThumb;
      } else {
        const vimeoThumb = await getVimeoThumbnail(finalUrl);
        if (vimeoThumb) preview_image_url = vimeoThumb;
      }
    }

    return {
      content_type: "link",
      url: finalUrl,
      video_url: null,
      html_url: null,
      pdf_url: null,
      image_url: null,
      markdown_content: null,
      ...(preview_image_url ? { preview_image_url } : {}),
    };
  };

  const form = useContentBuilderForm({
    contentType: "link",
    space,
    collectionId,
    validate,
    buildTypePayload,
  });

  // Auto-fetch a page preview the moment a non-video URL is entered (debounced).
  // Video URLs derive their preview from the platform thumbnail at submit time
  // and show a live embed below, so they skip the screenshot round-trip.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedRef = useRef<string>(space?.url ? normalizeUrl(space.url) : "");
  const previewFileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = normalizeUrl(trimmed);
    if (detectVideo(normalized)) return;
    if (normalized === lastFetchedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastFetchedRef.current = normalized;
      form.fetchUrlPreview(trimmed);
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const newPreview = form.previewObjectUrl;
  const existingPreview =
    space?.preview_image_url && !form.clearExistingImage ? space.preview_image_url : null;
  const previewSrc = newPreview || existingPreview;

  return (
    <ContentBuilderShell contentType="link" space={space} form={form} showPreviewSection={false}>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="url">{t.contentBuilder.linkUrlLabel}</Label>
          <Input
            id="url"
            type="text"
            placeholder={t.contentBuilder.linkUrlPlaceholder}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value.slice(0, MAX_URL_LENGTH));
              form.clearScreenshotError();
            }}
            maxLength={MAX_URL_LENGTH}
            required
            className="bg-muted/50 border-border/60 focus:border-violet-500/50 focus:bg-background transition-colors"
          />
          <p className="text-xs text-muted-foreground">{t.contentBuilder.linkProtocolHint}</p>
        </div>

        {isVideo ? (
          // Recognized video → live embed preview; thumbnail is derived on save.
          <div className="rounded-xl overflow-hidden border border-border/60 bg-black aspect-video">
            <iframe
              src={videoInfo!.embedUrl}
              title={t.contentBuilder.videoPreviewIframeTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          url.trim() && (
            <div className="space-y-2">
              {form.isGenerating ? (
                <div className="flex aspect-video w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 text-sm text-muted-foreground">
                  <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  {t.contentBuilder.linkCapturing}
                </div>
              ) : previewSrc ? (
                <div className="overflow-hidden rounded-xl border border-border/60 bg-muted aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt={t.contentBuilder.previewLabel}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : form.screenshotError ? (
                <p className="text-xs text-muted-foreground">{form.screenshotError}</p>
              ) : null}

              {!form.isGenerating && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => previewFileInputRef.current?.click()}
                    className="gap-1.5 border-border/60"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {previewSrc ? t.contentBuilder.replaceImage : t.contentBuilder.uploadImage}
                  </Button>
                  <input
                    ref={previewFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) form.setPreviewImageFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
            </div>
          )
        )}
      </div>
    </ContentBuilderShell>
  );
}
