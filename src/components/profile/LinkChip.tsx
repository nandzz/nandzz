"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { SpacePreview } from "@/features/spaces";
import type { Space } from "@/lib/types";
import { getFaviconUrl, getLinkHost, getLinkTarget } from "@/lib/spaces/links";

interface LinkChipProps {
  space: Space;
  /** Eager-load the preview image (first above-the-fold chip only). */
  priority?: boolean;
}

/** A single link rendered as a small card: its preview image with the
 * provider's logo (favicon) badged over it, then the title and host. Opens the
 * external URL in a new tab; falls back to the in-app space page if the URL
 * isn't a safe http(s) link. */
export function LinkChip({ space, priority = false }: LinkChipProps) {
  const [iconFailed, setIconFailed] = useState(false);

  const target = getLinkTarget(space);
  const host = getLinkHost(target);
  const faviconUrl = getFaviconUrl(target);
  const href = target ?? `/space/${space.id}`;
  const externalProps = target
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Link
      href={href}
      {...externalProps}
      className="group @container block h-full w-full overflow-hidden rounded-xl border border-foreground/10 bg-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <SpacePreview space={space} priority={priority} />
        {/* Provider logo badge (favicon), bottom-left over the preview. */}
        <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-background/90 shadow-sm ring-1 ring-black/5 backdrop-blur dark:ring-white/10">
          {faviconUrl && !iconFailed ? (
            // Plain <img>: favicons are tiny and come from an arbitrary host, so
            // next/image (domain allowlist) is overkill. onError → Globe fallback.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={faviconUrl}
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px] object-contain"
              loading="lazy"
              onError={() => setIconFailed(true)}
            />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400">
          {space.title}
        </p>
        {host && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{host}</p>
        )}
      </div>
    </Link>
  );
}
