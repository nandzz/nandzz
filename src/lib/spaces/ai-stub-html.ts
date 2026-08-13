import type { SupabaseClient } from "@supabase/supabase-js";

/** Escape user-controlled text before interpolating it into HTML markup. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The minimal placeholder page uploaded for a brand-new "AI Generated" space.
 * Content is filled in later via the AI Edit assistant (HtmlSpaceEditor).
 * Pure template — no JSX, no network calls — so it's trivially testable.
 * The title is user-controlled and this HTML is served from a public bucket,
 * so it must be HTML-escaped to prevent stored XSS.
 */
export function buildAiStubHtml(title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #09090b; color: #ffffff; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  p { opacity: 0.35; font-size: 14px; letter-spacing: 0.01em; }
</style>
</head>
<body><p>Use the AI assistant to generate content ✦</p></body>
</html>`;
}

/**
 * Uploads the AI stub HTML to the `space-html` bucket and returns its public URL.
 * Throws on upload failure — callers should surface `error.message` to the user.
 */
export async function uploadAiStubHtml(
  supabase: SupabaseClient,
  userId: string,
  title: string
): Promise<string> {
  const stub = buildAiStubHtml(title);
  const stubBlob = new Blob([stub], { type: "text/html" });
  const filePath = `${userId}/${Date.now()}.html`;
  const { error: uploadError } = await supabase.storage
    .from("space-html")
    .upload(filePath, stubBlob, { contentType: "text/html", upsert: false });
  if (uploadError) {
    throw new Error("Failed to create content: " + uploadError.message);
  }
  const { data: publicUrlData } = supabase.storage.from("space-html").getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}
