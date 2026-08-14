import type { Space } from "@/lib/types";

/** Only http(s) links are safe to navigate to directly — rejects javascript:,
 * data:, vbscript:, etc. Mirrors the guard in SpaceCard.tsx. */
export function isSafeHttpUrl(u: string): boolean {
  try {
    const { protocol } = new URL(u);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** The external URL a link/video space points to. New link rows store it in
 * `url`; legacy `video` rows use `video_url`. Returns null unless it's a safe
 * http(s) URL. */
export function getLinkTarget(space: Pick<Space, "url" | "video_url">): string | null {
  const target = space.url ?? space.video_url ?? null;
  return target && isSafeHttpUrl(target) ? target : null;
}

/** Extracts a clean hostname (no leading `www.`) from a URL, or null if it can't
 * be parsed. */
export function getLinkHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Favicon URL for a link's host via DuckDuckGo's icon service — returns the
 * provider's own logo (YouTube's play button, GitHub's mark, …) for known sites
 * and a generic glyph otherwise. Null when the host can't be resolved. The
 * <img> using this must fall back to a Globe icon on error, since some hosts
 * serve no icon. */
export function getFaviconUrl(url: string | null | undefined): string | null {
  const host = getLinkHost(url);
  return host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : null;
}
