import Image from "next/image";
import type { Space } from "@/lib/types";

interface SpacePreviewProps {
  space: Space;
}

export function SpacePreview({ space }: SpacePreviewProps) {
  // If there's a preview image (custom or auto-generated screenshot), use it
  if (space.preview_image_url) {
    return (
      <Image
        src={space.preview_image_url}
        alt={space.title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform group-hover:scale-105"
      />
    );
  }

  // Fallback: letter avatar with gradient
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950 dark:to-violet-900">
      <span className="text-4xl font-bold text-violet-300 dark:text-violet-700">
        {space.title[0]?.toUpperCase()}
      </span>
    </div>
  );
}
