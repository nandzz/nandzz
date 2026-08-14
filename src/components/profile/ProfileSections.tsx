"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { persistProfileUpdate } from "@/lib/profile/update";
import { SectionOrderContext } from "./section-order-context";
import type { SectionId } from "@/lib/gallery/layouts";

interface ProfileSectionsProps {
  /** Rendered section content keyed by id; a `null` value is skipped (the owner
   * has that section but it's empty, or a visitor can't see it). */
  sections: Record<SectionId, ReactNode>;
  /** The owner's chosen order (already resolved to the full set of ids). */
  order: SectionId[];
  isOwner: boolean;
  profileId: string;
  username: string;
}

const sameOrder = (a: SectionId[], b: SectionId[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * Renders the profile's three sections in the owner's chosen order. The owner
 * reorders them from the menu in each section header (see `SectionOwnerMenu`),
 * which reads the order from this component's context; the new order persists
 * to `profiles.section_order`. Visitors just see the sections in order with no
 * controls.
 */
export function ProfileSections({
  sections,
  order: initialOrder,
  isOwner,
  profileId,
  username,
}: ProfileSectionsProps) {
  const router = useRouter();
  const [order, setOrder] = useState<SectionId[]>(initialOrder);

  // Adjust-during-render sync if the server sends a fresh order.
  const [prevInitial, setPrevInitial] = useState(initialOrder);
  if (!sameOrder(initialOrder, prevInitial)) {
    setPrevInitial(initialOrder);
    setOrder(initialOrder);
  }

  // Only sections with content are shown, so reordering operates on those; any
  // hidden section keeps its stored position by trailing the persisted order.
  const visibleOrder = useMemo(
    () => order.filter((id) => sections[id]),
    [order, sections],
  );

  const commit = useCallback(
    async (next: SectionId[]) => {
      const previous = order;
      setOrder(next); // optimistic
      try {
        await persistProfileUpdate(profileId, username, { section_order: next });
        router.refresh();
      } catch {
        setOrder(previous); // revert on failure
      }
    },
    [order, profileId, username, router],
  );

  const move = useCallback(
    (id: SectionId, dir: -1 | 1) => {
      const visible = order.filter((x) => sections[x]);
      const idx = visible.indexOf(id);
      const swapWith = idx + dir;
      if (idx === -1 || swapWith < 0 || swapWith >= visible.length) return;
      const next = [...visible];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      const hidden = order.filter((x) => !sections[x]);
      void commit([...next, ...hidden]);
    },
    [order, sections, commit],
  );

  const content = order.map((id) => {
    const node = sections[id];
    if (!node) return null;
    return (
      <div key={id} className="mt-12">
        {node}
      </div>
    );
  });

  if (!isOwner) return <>{content}</>;

  return (
    <SectionOrderContext.Provider value={{ order: visibleOrder, move }}>
      {content}
    </SectionOrderContext.Provider>
  );
}
