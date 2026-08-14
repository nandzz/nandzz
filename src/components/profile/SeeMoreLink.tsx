"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SeeMoreLinkProps {
  label: string;
  /** Navigate here on click. Ignored when `onClick` is provided. */
  href?: string;
  /** Open a modal (etc.) instead of navigating — used by the profile gallery
   * preview, whose "see more" opens a paginated modal in place. */
  onClick?: () => void;
}

const CLASS =
  "group inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:border-violet-700 dark:hover:bg-violet-900/50";

const arrow = (
  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
);

/** Prominent "See more" pill shown at the bottom-right of a profile section
 * when it has more items than fit in the inline preview. */
export function SeeMoreLink({ label, href, onClick }: SeeMoreLinkProps) {
  return (
    <div className="flex justify-end pb-6">
      {onClick ? (
        <button type="button" onClick={onClick} className={CLASS}>
          {label}
          {arrow}
        </button>
      ) : (
        <Link href={href ?? "#"} className={CLASS}>
          {label}
          {arrow}
        </Link>
      )}
    </div>
  );
}
