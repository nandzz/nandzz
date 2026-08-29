"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, BarChart2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteSpace } from "../actions/delete-space";
import { useLanguage } from "@/contexts/LanguageContext";

interface SpaceOwnerMenuProps {
  spaceId: string;
  editHref: string;
  redirectTo: string;
}

export function SpaceOwnerMenu({ spaceId, editHref, redirectTo }: SpaceOwnerMenuProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Opening a portal dialog straight from a Base UI menu item races with the
  // menu's own close (backdrop / scroll-lock / focus-return tear down over the
  // exit animation), which swallows the dialog. Close the menu first, then open
  // the dialog on the next frame once that teardown has settled.
  const requestDelete = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => setConfirmOpen(true));
  };

  const handleDelete = async () => {
    const result = await deleteSpace({ id: spaceId });
    if (!result.ok) return;
    // Go back to wherever the user came from (the content list, a collection,
    // the profile…) instead of a fixed page. The action already revalidated the
    // caches, so that previous page renders fresh with the deleted item gone.
    // Fall back to `redirectTo` when there's no in-app history (e.g. the space
    // was opened directly from a shared link).
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(redirectTo);
    }
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          aria-label={t.space.spaceActions}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-max">
          <DropdownMenuItem onClick={() => router.push(editHref)}>
            <Pencil className="h-4 w-4" />
            {t.space.edit}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/dashboard/analytics/${spaceId}`)}>
            <BarChart2 className="h-4 w-4" />
            {t.space.analytics}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={requestDelete}>
            <Trash2 className="h-4 w-4" />
            {t.space.deleteSpace}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t.space.deleteSpace}
        description={t.space.confirmDelete}
        confirmLabel={t.space.deleteSpace}
        cancelLabel={t.space.cancel}
      />
    </>
  );
}
