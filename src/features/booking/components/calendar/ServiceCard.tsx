"use client";

import { Clock, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CalendarService, StaffMember } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  service: CalendarService;
  staff: StaffMember[];
  currencySymbol: string; // owner-selected widget currency symbol
  onOpen: () => void;
  onDelete: () => void;
}

// A compact service tile: name + a duration/price meta row, plus an at-a-glance
// summary of who can perform it. The whole card opens the editor; the delete
// affordance is a sibling button (not nested) so the markup stays valid and
// keyboard-navigable. Mirrors StaffCard's shape so the two tabs feel like one system.
export function ServiceCard({ service, staff, currencySymbol, onOpen, onDelete }: Props) {
  const { t } = useLanguage();
  const name = service.name?.trim() || t.booking.servicePlaceholder;

  const priceLabel =
    service.price_cents != null
      ? `${currencySymbol}${(service.price_cents / 100).toLocaleString()}`
      : t.booking.freePlaceholder;

  // Who can perform this — empty allow-list ⇒ anyone. Resolve ids to members
  // (dropping any dangling ones) so we can show avatars.
  const allow = service.staff_ids ?? [];
  const performers = allow.length ? staff.filter((s) => allow.includes(s.id)) : [];
  const anyone = performers.length === 0;

  return (
    <div className="group relative rounded-2xl border border-border bg-background transition-all hover:border-emerald-400/70 hover:shadow-sm focus-within:border-emerald-400/70">
      <button
        type="button"
        onClick={onOpen}
        aria-label={t.booking.editServiceAria.replace("{name}", name)}
        className="flex w-full flex-col gap-3 rounded-2xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <p className="truncate pr-6 font-medium text-foreground">{name}</p>

        {/* Meta row: duration + price */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            {service.duration_min} {t.booking.minSuffix}
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {priceLabel}
          </span>
        </div>

        {/* Who can perform — avatars, or an "anyone" hint when unrestricted */}
        {staff.length > 0 && (
          <div className="flex items-center gap-2 border-t border-border/60 pt-3">
            {anyone ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {t.booking.anyoneCanPerform}
              </span>
            ) : (
              <>
                <div className="flex -space-x-2">
                  {performers.slice(0, 4).map((st) => (
                    <Avatar key={st.id} size="sm" className="h-6 w-6 ring-2 ring-background">
                      <AvatarImage src={st.photo_url || undefined} />
                      <AvatarFallback className="bg-emerald-100 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {st.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {performers.length > 4 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    +{performers.length - 4}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={t.booking.removeServiceAria}
        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-muted-foreground opacity-0 outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-emerald-400 group-hover:opacity-100 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
