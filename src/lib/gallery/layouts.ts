import type { LucideIcon } from "lucide-react";
import { LayoutGrid, LayoutDashboard, GalleryHorizontal, GalleryThumbnails } from "lucide-react";
import type { Profile } from "@/lib/types";
import type { Translations } from "@/lib/i18n/translations";

/** The layouts a profile owner can choose for their image gallery. */
export type GalleryLayout = "grid" | "masonry" | "justified" | "featured";

/** Ordered for the settings menu. */
export const GALLERY_LAYOUTS: GalleryLayout[] = [
  "grid",
  "masonry",
  "justified",
  "featured",
];

export const GALLERY_LAYOUT_ICONS: Record<GalleryLayout, LucideIcon> = {
  grid: LayoutGrid,
  masonry: GalleryThumbnails,
  justified: GalleryHorizontal,
  featured: LayoutDashboard,
};

function isGalleryLayout(value: string | null | undefined): value is GalleryLayout {
  return value === "grid" || value === "masonry" || value === "justified" || value === "featured";
}

/** Narrows a profile's stored `gallery_layout` to a valid layout, defaulting to grid. */
export function resolveGalleryLayout(profile: Pick<Profile, "gallery_layout">): GalleryLayout {
  return isGalleryLayout(profile.gallery_layout) ? profile.gallery_layout : "grid";
}

/** Resolves a layout's display label from the current locale's translations. */
export function getGalleryLayoutLabel(t: Translations, id: GalleryLayout): string {
  const labels: Record<GalleryLayout, string> = {
    grid: t.profile.layoutGrid,
    masonry: t.profile.layoutMasonry,
    justified: t.profile.layoutJustified,
    featured: t.profile.layoutFeatured,
  };
  return labels[id];
}
