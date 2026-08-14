"use client";

import { createContext, useContext } from "react";
import type { SectionId } from "@/lib/gallery/layouts";

export interface SectionOrderContextValue {
  /** The currently visible sections, in display order. */
  order: SectionId[];
  /** Moves a section one step up (-1) or down (+1) among the visible sections. */
  move: (id: SectionId, dir: -1 | 1) => void;
}

/** Provided by `ProfileSections` only to the owner; visitors get `null`, which
 * hides the reorder controls. */
export const SectionOrderContext = createContext<SectionOrderContextValue | null>(null);

export function useSectionOrder(): SectionOrderContextValue | null {
  return useContext(SectionOrderContext);
}
