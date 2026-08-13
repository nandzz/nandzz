"use client";

import type { Profile, WidgetInstanceWithCatalog } from "@/lib/types";
import { CalendarWidgetEmbed } from "./calendar/CalendarWidgetEmbed";
import { AgentWidgetCard } from "./agent/AgentWidgetCard";

interface WidgetStripProps {
  widgets: WidgetInstanceWithCatalog[];
  profile: Profile;
  isAuthenticated?: boolean;
}

// Renders the row of widget triggers that sit on top of a profile. Each widget
// type maps to its own embed component; unknown types are skipped.
export function WidgetStrip({ widgets, profile, isAuthenticated = false }: WidgetStripProps) {
  return (
    <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
      {widgets.map((w) => {
        switch (w.catalog.slug) {
          case "calendar":
            return <CalendarWidgetEmbed key={w.id} instance={w} profile={profile} />;
          case "agent":
            return (
              <AgentWidgetCard
                key={w.id}
                instance={w}
                profile={profile}
                isAuthenticated={isAuthenticated}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
