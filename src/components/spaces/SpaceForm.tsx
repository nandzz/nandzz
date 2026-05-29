"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Code, Globe, Rocket, UploadCloud, FileCode2, FileText, X, Download } from "lucide-react";
import { TagPicker } from "./TagPicker";
import type { Space, Tag } from "@/lib/types";
import { sandboxHtml } from "@/lib/sandbox-html";

type SpaceMode = "html" | "url" | "pdf";

/** Render HTML in a hidden iframe and capture a screenshot using html2canvas */
async function captureHtmlScreenshot(
  htmlContent: string
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    iframe.style.border = "none";
    iframe.srcdoc = sandboxHtml(htmlContent);

    iframe.onload = async () => {
      try {
        const html2canvas = (await import("html2canvas")).default;
        const body = iframe.contentDocument?.body;
        if (!body) {
          document.body.removeChild(iframe);
          resolve(null);
          return;
        }
        const canvas = await html2canvas(body, {
          width: 1024,
          height: 768,
          windowWidth: 1024,
          windowHeight: 768,
          useCORS: true,
        });
        canvas.toBlob(
          (blob) => {
            document.body.removeChild(iframe);
            resolve(blob);
          },
          "image/png",
          0.8
        );
      } catch {
        document.body.removeChild(iframe);
        resolve(null);
      }
    };

    document.body.appendChild(iframe);
  });
}

interface SpaceFormProps {
  space?: Space;
  initialTags?: Tag[];
}

export function SpaceForm({ space, initialTags = [] }: SpaceFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isEditing = !!space;

  const [spaceType, setSpaceType] = useState<SpaceMode>(
    space?.pdf_url ? "pdf" : space?.html_url ? "html" : space?.url ? "url" : "html"
  );
  const [title, setTitle] = useState(space?.title || "");
  const [description, setDescription] = useState(space?.description || "");
  const [url, setUrl] = useState(space?.url || "");
  const [htmlContent, setHtmlContent] = useState("");
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(space?.is_public ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [htmlFileName, setHtmlFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialTags);

  useEffect(() => {
    supabase
      .from("tags")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setAvailableTags(data as Tag[]);
      });
  }, [supabase]);

  useEffect(() => {
    if (space?.html_url && !htmlContent) {
      fetch(space.html_url)
        .then((r) => r.text())
        .then(setHtmlContent)
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.html_url]);

  useEffect(() => {
    if (spaceType === "pdf") {
      const pdfTag = availableTags.find((t) => t.slug === "pdf");
      if (pdfTag) setSelectedTags([pdfTag]);
    }
  }, [spaceType, availableTags]);


  const MAX_HTML_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
  const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
  const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

  const handlePdfFileUpload = (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted");
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setError("PDF file must be under 10 MB");
      return;
    }
    setPdfFile(file);
  };

  const handleHtmlFileUpload = (file: File) => {
    if (file.size > MAX_HTML_SIZE) {
      setError("HTML file must be under 1.5 MB");
      return;
    }
    setHtmlFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setHtmlContent(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in");
        return;
      }

      if (spaceType === "url" && !url) {
        setError("URL is required for URL spaces");
        setLoading(false);
        return;
      }

      // Auto-prepend https:// if no protocol is provided
      let normalizedUrl = url.trim();
      if (
        spaceType === "url" &&
        normalizedUrl &&
        !/^https?:\/\//i.test(normalizedUrl)
      ) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      // Block javascript: and data: URL schemes
      if (
        spaceType === "url" &&
        /^(javascript|data|vbscript):/i.test(normalizedUrl)
      ) {
        setError("Invalid URL scheme. Only http and https URLs are allowed.");
        setLoading(false);
        return;
      }

      if (spaceType === "html" && !htmlContent && !space?.html_url) {
        setError("HTML content is required. Upload a file or paste HTML.");
        setLoading(false);
        return;
      }

      if (spaceType === "pdf" && !pdfFile && !space?.pdf_url) {
        setError("A PDF file is required.");
        setLoading(false);
        return;
      }

      let preview_image_url = space?.preview_image_url || null;
      let html_url = space?.html_url || null;
      let pdf_url = space?.pdf_url || null;

      // Validate preview image size
      if (previewImage && previewImage.size > MAX_IMAGE_SIZE) {
        setError("Preview image must be under 1.5 MB");
        setLoading(false);
        return;
      }

      // Upload preview image if provided
      if (previewImage) {
        const fileExt = previewImage.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("space-previews")
          .upload(filePath, previewImage);

        if (uploadError) {
          setError("Failed to upload image: " + uploadError.message);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("space-previews")
          .getPublicUrl(filePath);
        preview_image_url = publicUrlData.publicUrl;
      }

      // Upload HTML content to storage bucket
      if (spaceType === "html" && htmlContent) {
        const htmlBlob = new Blob([htmlContent], { type: "text/html" });
        const filePath = `${user.id}/${Date.now()}.html`;
        const { error: uploadError } = await supabase.storage
          .from("space-html")
          .upload(filePath, htmlBlob, {
            contentType: "text/html",
            upsert: false,
          });

        if (uploadError) {
          setError("Failed to upload HTML: " + uploadError.message);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("space-html")
          .getPublicUrl(filePath);
        html_url = publicUrlData.publicUrl;

        // Auto-generate screenshot if no manual preview image was provided
        if (!previewImage && !preview_image_url) {
          const screenshotBlob = await captureHtmlScreenshot(htmlContent);
          if (screenshotBlob) {
            const screenshotPath = `${user.id}/${Date.now()}-auto.png`;
            const { error: ssError } = await supabase.storage
              .from("space-previews")
              .upload(screenshotPath, screenshotBlob, {
                contentType: "image/png",
              });
            if (!ssError) {
              const { data: ssUrl } = supabase.storage
                .from("space-previews")
                .getPublicUrl(screenshotPath);
              preview_image_url = ssUrl.publicUrl;
            }
          }
        }
      }

      // Upload PDF to storage bucket
      if (spaceType === "pdf" && pdfFile) {
        const filePath = `${user.id}/${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("space-pdfs")
          .upload(filePath, pdfFile, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          setError("Failed to upload PDF: " + uploadError.message);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("space-pdfs")
          .getPublicUrl(filePath);
        pdf_url = publicUrlData.publicUrl;
      }

      const spaceData = {
        title,
        description: description || null,
        url: spaceType === "url" ? normalizedUrl : null,
        html_url: spaceType === "html" ? html_url : null,
        pdf_url: spaceType === "pdf" ? pdf_url : null,
        preview_image_url,
        is_public: isPublic,
        user_id: user.id,
      };

      let spaceId: string;

      if (isEditing && space) {
        const { error } = await supabase
          .from("spaces")
          .update(spaceData)
          .eq("id", space.id);
        if (error) throw error;
        spaceId = space.id;
      } else {
        const { data: inserted, error } = await supabase
          .from("spaces")
          .insert(spaceData)
          .select("id")
          .single();
        if (error) throw error;
        spaceId = inserted.id;
      }

      // Save tags: replace all existing with the current selection
      await supabase.from("space_tags").delete().eq("space_id", spaceId);
      if (selectedTags.length > 0) {
        await supabase.from("space_tags").insert(
          selectedTags.map((t) => ({ space_id: spaceId, tag_id: t.id }))
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const supaErr = err as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      const message =
        supaErr?.message ||
        (err instanceof Error ? err.message : "Something went wrong");
      const details = supaErr?.details || supaErr?.hint || "";
      setError(details ? `${message} — ${details}` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-lg shadow-black/5 dark:shadow-black/20 border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <Rocket className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-xl">
              {isEditing ? "Edit Space" : "Create a New Space"}
            </CardTitle>
            <CardDescription>
              Save a website URL or upload HTML generated by AI tools like
              Claude or ChatGPT.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Space Type Toggle */}
          <div className="space-y-2">
            <Label>Space Type</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSpaceType("html")}
                className={`flex-1 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                  spaceType === "html"
                    ? "border-violet-600 bg-violet-50 dark:bg-violet-950/50 shadow-sm shadow-violet-600/10"
                    : "border-border/60 hover:border-violet-500/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Code
                    className={`h-4 w-4 ${
                      spaceType === "html"
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      spaceType === "html"
                        ? "text-violet-700 dark:text-violet-300"
                        : ""
                    }`}
                  >
                    HTML Upload
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Paste or upload HTML from AI tools
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSpaceType("pdf")}
                className={`flex-1 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                  spaceType === "pdf"
                    ? "border-violet-600 bg-violet-50 dark:bg-violet-950/50 shadow-sm shadow-violet-600/10"
                    : "border-border/60 hover:border-violet-500/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText
                    className={`h-4 w-4 ${
                      spaceType === "pdf"
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      spaceType === "pdf"
                        ? "text-violet-700 dark:text-violet-300"
                        : ""
                    }`}
                  >
                    PDF Upload
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Upload a PDF document
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSpaceType("url")}
                className={`flex-1 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                  spaceType === "url"
                    ? "border-violet-600 bg-violet-50 dark:bg-violet-950/50 shadow-sm shadow-violet-600/10"
                    : "border-border/60 hover:border-violet-500/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe
                    className={`h-4 w-4 ${
                      spaceType === "url"
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      spaceType === "url"
                        ? "text-violet-700 dark:text-violet-300"
                        : ""
                    }`}
                  >
                    Website URL
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Link to an external website
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <p className="text-xs text-muted-foreground">Pick one tag that best describes your space</p>
            <TagPicker
              availableTags={availableTags}
              selectedTag={selectedTags[0] ?? null}
              onChange={(tag) => setSelectedTags(tag ? [tag] : [])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="My Awesome App"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-muted/50 border-border/60 focus:border-violet-500/50 focus:bg-background transition-colors"
            />
          </div>

          {/* PDF input */}
          {spaceType === "pdf" && (
            <div className="space-y-4">
              <input
                ref={pdfFileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfFileUpload(file);
                }}
              />

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
                    onClick={() => {
                      setPdfFile(null);
                      if (pdfFileInputRef.current) pdfFileInputRef.current.value = "";
                    }}
                    className="rounded-full p-1 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                  >
                    <X className="h-4 w-4 text-violet-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => pdfFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true); }}
                  onDragLeave={() => setPdfDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setPdfDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handlePdfFileUpload(file);
                  }}
                  className={`w-full rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                    pdfDragOver
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : "border-border/60 hover:border-violet-400/60 hover:bg-muted/40"
                  }`}
                >
                  <UploadCloud className={`mx-auto h-8 w-8 mb-3 ${pdfDragOver ? "text-violet-500" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium text-foreground">
                    Drop your PDF here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or <span className="text-violet-600 dark:text-violet-400 underline underline-offset-2">browse</span> — .pdf, up to 10 MB
                  </p>
                </button>
              )}

              {isEditing && space?.pdf_url && !pdfFile && (
                <p className="text-xs text-muted-foreground">
                  Current PDF will be kept if no new file is provided.
                </p>
              )}
            </div>
          )}

          {/* URL input */}
          {spaceType === "url" && (
            <div className="space-y-2">
              <Label htmlFor="url">Website URL *</Label>
              <Input
                id="url"
                type="text"
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="bg-muted/50 border-border/60 focus:border-violet-500/50 focus:bg-background transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                No need to type https:// — we&apos;ll add it automatically
              </p>
            </div>
          )}

          {/* HTML input */}
          {spaceType === "html" && (
            <div className="space-y-4">
              {/* Drop zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleHtmlFileUpload(file);
                }}
              />

              {htmlFileName ? (
                <div className="flex items-center gap-3 rounded-xl border border-violet-400/50 bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
                  <FileCode2 className="h-5 w-5 shrink-0 text-violet-500" />
                  <span className="flex-1 text-sm font-medium text-violet-700 dark:text-violet-300 truncate">
                    {htmlFileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHtmlFileName("");
                      setHtmlContent("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-full p-1 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                  >
                    <X className="h-4 w-4 text-violet-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleHtmlFileUpload(file);
                  }}
                  className={`w-full rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                    dragOver
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : "border-border/60 hover:border-violet-400/60 hover:bg-muted/40"
                  }`}
                >
                  <UploadCloud className={`mx-auto h-8 w-8 mb-3 ${dragOver ? "text-violet-500" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium text-foreground">
                    Drop your HTML file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or <span className="text-violet-600 dark:text-violet-400 underline underline-offset-2">browse</span> — .html / .htm, up to 1.5 MB
                  </p>
                </button>
              )}

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border/50" />
                <span className="px-3 text-xs text-muted-foreground">or paste HTML directly</span>
                <div className="flex-1 border-t border-border/50" />
              </div>

              <div className="space-y-2">
                <Textarea
                  id="htmlContent"
                  placeholder={"<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>"}
                  value={htmlContent}
                  onChange={(e) => { setHtmlContent(e.target.value); setHtmlFileName(""); }}
                  rows={6}
                  className="font-mono text-xs bg-muted/50 border-border/60 focus:border-violet-500/50 focus:bg-background transition-colors"
                />
                {htmlContent && (
                  <p className="text-xs text-muted-foreground">
                    {htmlContent.length.toLocaleString()} characters loaded
                  </p>
                )}
              </div>

              {/* Live Preview */}
              {htmlContent && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="rounded-xl border border-border/60 overflow-hidden bg-white shadow-sm">
                    <iframe
                      srcDoc={sandboxHtml(htmlContent)}
                      className="w-full h-64 border-0"
                      sandbox="allow-scripts"
                      title="HTML Preview"
                    />
                  </div>
                </div>
              )}

              {isEditing && space?.html_url && !htmlContent && (
                <p className="text-xs text-muted-foreground">
                  Current HTML file will be kept if no new content is provided.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A short description of what this app does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-muted/50 border-border/60 focus:border-violet-500/50 focus:bg-background transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview">Preview Image (optional)</Label>
            <Input
              id="preview"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setPreviewImage(e.target.files?.[0] || null)
              }
              className="bg-muted/50 border-border/60"
            />
            <p className="text-xs text-muted-foreground">
              Optional — a live preview will be shown if no image is provided
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/50">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-violet-600"
              />
              <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                Make this Space public
              </Label>
            </div>
            {isPublic && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                <Globe className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Everyone will be able to view this Space, but only you can edit it.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={
                loading ||
                !title.trim() ||
                selectedTags.length === 0 ||
                (spaceType === "url" && !url.trim()) ||
                (spaceType === "html" && !htmlContent && !space?.html_url) ||
                (spaceType === "pdf" && !pdfFile && !space?.pdf_url)
              }
            >
              {loading
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Space"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-border/60 hover:border-violet-500/50 transition-colors"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
