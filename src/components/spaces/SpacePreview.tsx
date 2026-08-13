import Image from "next/image";
import { Globe } from "lucide-react";
import type { Space } from "@/lib/types";
import { getGradient } from "@/lib/preview-gradients";
import { resolveContentType } from "@/lib/spaces/content-types";

interface SpacePreviewProps {
  space: Space;
}

export function SpacePreview({ space }: SpacePreviewProps) {
  const previewSrc = space.preview_image_url ?? space.image_url;

  if (previewSrc) {
    return (
      <Image
        src={previewSrc}
        alt={space.title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform group-hover:scale-105"
      />
    );
  }

  const gradient = getGradient(space.preview_gradient);
  const isLink = !space.preview_title && resolveContentType(space) === "link";

  return (
    <div className={`flex h-full w-full items-center justify-center ${gradient.bg}`}>
      {space.preview_title ? (
        <span className={`w-full text-center text-base @[200px]:text-xl @[320px]:text-3xl font-bold leading-tight px-4 line-clamp-3 ${gradient.text}`}>
          {space.preview_title}
        </span>
      ) : isLink ? (
        <Globe className={`h-8 w-8 @[200px]:h-10 @[200px]:w-10 @[320px]:h-14 @[320px]:w-14 ${gradient.text}`} />
      ) : (
        <span className={`text-lg @[200px]:text-xl @[320px]:text-3xl font-bold ${gradient.text}`}>
          {space.title[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}
