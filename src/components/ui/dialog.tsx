"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Tailwind max-width class for the panel; defaults to `max-w-md`. */
  maxWidthClass?: string;
  /**
   * Whether the visitor can dismiss the dialog themselves (backdrop click,
   * Escape, and the close button). Defaults to true. Set false for flows that
   * must be completed — e.g. finishing sign-up before continuing — so the only
   * way out is to finish (which the caller triggers via its own success path).
   */
  dismissable?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-md",
  dismissable = true,
}: DialogProps) {
  useEffect(() => {
    if (!open || !dismissable) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, dismissable]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismissable ? onClose : undefined}
      />
      <div className={`relative z-10 w-full ${maxWidthClass} mx-4`}>
        <div className="bg-background border border-border/60 rounded-xl shadow-xl p-6">
          {(title || dismissable) && (
            <div className="flex items-center justify-between mb-4">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {dismissable && (
                <button
                  onClick={onClose}
                  className="ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
