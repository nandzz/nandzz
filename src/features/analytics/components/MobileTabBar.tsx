"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Home, Plus, LayoutGrid, User, LogIn, Rss } from "lucide-react";
import type { ProfileLite } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChrome } from "@/contexts/ChromeContext";
import { getSessionUser, onAuthChange, fetchProfileLite } from "../auth";

type TabDef = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  isActive: (pathname: string) => boolean;
  highlight?: boolean;
};

const UNAUTH_TAB_DEFS: TabDef[] = [
  { href: "/", labelKey: "home", icon: Home, isActive: (p) => p === "/" },
  { href: "/login", labelKey: "signIn", icon: LogIn, isActive: (p) => p.startsWith("/login") },
];

function getAuthTabDefs(username: string | null): TabDef[] {
  return [
    { href: "/dashboard/feed", labelKey: "feed", icon: Rss, isActive: (p) => p.startsWith("/dashboard/feed") },
    { href: "/dashboard/contents/create-space", labelKey: "create", icon: Plus, isActive: (p) => p.startsWith("/dashboard/contents/create-space"), highlight: true },
    { href: "/dashboard/contents", labelKey: "spaces", icon: LayoutGrid, isActive: (p) => p === "/dashboard/contents" || (p.startsWith("/dashboard/contents") && !p.startsWith("/dashboard/contents/create-space")) },
    { href: username ? `/${username}` : "/dashboard/settings", labelKey: "profile", icon: User, isActive: (p) => username ? p === `/${username}` : false },
  ];
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isHidden } = useChrome();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const data = await fetchProfileLite(userId);
    if (data) setProfile(data);
  }, []);

  useEffect(() => {
    getSessionUser().then((u) => {
      if (u) {
        setUser(u);
        fetchProfile(u.id);
      }
    });

    return onAuthChange((u) => {
      if (u) {
        setUser(u);
        fetchProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });
  }, [fetchProfile]);

  const tabDefs = user ? getAuthTabDefs(profile?.username ?? null) : UNAUTH_TAB_DEFS;

  return (
    <nav
      aria-hidden={isHidden}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80",
        "transition-transform duration-300 ease-out motion-reduce:transition-none will-change-transform",
        isHidden && "translate-y-full pointer-events-none"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-center justify-around px-1">
        {tabDefs.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;
          const label = t.mobileTab[tab.labelKey as keyof typeof t.mobileTab];

          if (tab.highlight) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={label}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/30 transition-transform active:scale-95">
                  <Icon className="h-5 w-5" />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2"
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  active ? "text-violet-600" : "text-muted-foreground"
                )}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors w-full text-center truncate px-0.5",
                  active ? "text-violet-600" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
