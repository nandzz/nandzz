"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Rss,
  LayoutGrid,
  Blocks,
  CreditCard,
  Palette,
  Settings,
  Plug,
  Moon,
  Sun,
  LogOut,
  User,
  Calendar,
  Users,
  UserPlus,
  BarChart3,
} from "lucide-react";
import type { ProfileLite } from "@/lib/types";
import { FEATURES } from "@/lib/flags";
import { usePlanEntitlements } from "@/lib/plan-client";
import { NotificationBell } from "./NotificationBell";
import { AiJobsIndicator } from "./AiJobsIndicator";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getSessionUser, onAuthChange, fetchProfileLite } from "../auth";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: (pathname: string) => boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  initialProfile?: ProfileLite | null;
}

export function Sidebar({ collapsed, onToggle, initialProfile = null }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const entitlements = usePlanEntitlements();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(initialProfile);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag to gate theme-dependent icon rendering (avoids hydration mismatch)
  useEffect(() => setMounted(true), []);

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

  useEffect(() => {
    const handler = () => {
      if (user) fetchProfile(user.id);
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [user, fetchProfile]);

  const handleLogout = () => {
    // Hand off to the server sign-out route: it clears the auth cookies on its
    // response and redirects to the public home page, guaranteeing a full
    // sign-out (client-only sign-out left the SSR session cookies behind).
    window.location.href = "/auth/signout";
  };

  const username = profile?.username ?? null;

  const navGroups: NavGroup[] = useMemo(() => {
    // Account
    const account: NavItem[] = [
      {
        href: "/dashboard/feed",
        label: t.nav.feed,
        icon: Rss,
        isActive: (p) => p.startsWith("/dashboard/feed"),
      },
      {
        href: "/dashboard/contents",
        label: t.nav.mySpaces,
        icon: LayoutGrid,
        isActive: (p) =>
          p === "/dashboard/contents" || p.startsWith("/dashboard/contents/"),
      },
      {
        href: "/dashboard/bookings",
        label: t.nav.bookings,
        icon: Calendar,
        isActive: (p) => p.startsWith("/dashboard/bookings"),
      },
      {
        href: "/dashboard/followers",
        label: t.nav.followers,
        icon: Users,
        isActive: (p) => p.startsWith("/dashboard/followers"),
      },
      {
        href: "/dashboard/following",
        label: t.nav.following,
        icon: UserPlus,
        isActive: (p) => p.startsWith("/dashboard/following"),
      },
    ];

    // Business
    const business: NavItem[] = [];
    if (FEATURES.widgets && entitlements.hasWidgets) {
      business.push({
        href: "/dashboard/widgets",
        label: "Widgets",
        icon: Blocks,
        isActive: (p) => p.startsWith("/dashboard/widgets"),
      });
    }
    if (FEATURES.brand) {
      business.push({
        href: "/dashboard/brand",
        label: "Brand",
        icon: Palette,
        isActive: (p) => p.startsWith("/dashboard/brand"),
      });
    }
    if (entitlements.hasAnalytics) {
      business.push({
        href: "/dashboard/analytics",
        label: t.nav.analytics,
        icon: BarChart3,
        isActive: (p) => p.startsWith("/dashboard/analytics"),
      });
    }

    // Settings
    const settings: NavItem[] = [
      {
        href: "/dashboard/settings",
        label: t.nav.settings,
        icon: Settings,
        isActive: (p) => p.startsWith("/dashboard/settings"),
      },
    ];
    if (FEATURES.monetization) {
      settings.push({
        href: "/dashboard/credits",
        label: "Subscription",
        icon: CreditCard,
        isActive: (p) => p.startsWith("/dashboard/credits"),
      });
    }
    if (entitlements.hasMcp) {
      settings.push({
        href: "/mcp",
        label: t.nav.mcp,
        icon: Plug,
        isActive: (p) => p.startsWith("/mcp"),
      });
    }

    return [
      { label: t.nav.groupAccount, items: account },
      { label: t.nav.groupBusiness, items: business },
      { label: t.nav.groupSettings, items: settings },
    ];
  }, [t, username, entitlements]);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "transition-[width] duration-300 ease-out motion-reduce:transition-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top: collapse toggle + profile */}
      <div className={cn("flex flex-col gap-3 border-b border-sidebar-border p-3", collapsed && "items-center")}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        {collapsed ? (
          <Link
            href={username ? `/${username}` : "/dashboard/settings"}
            title={profile?.display_name || username || "Profile"}
            className="flex justify-center rounded-md p-1.5 -m-1.5 hover:bg-sidebar-accent transition-colors"
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || username || "User avatar"} />
              <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-sm font-medium">
                {profile?.display_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Name + picture on the left, bell on the right */}
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || username || "User avatar"} />
                <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-sm font-medium">
                  {profile?.display_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-none truncate">
                  {profile?.display_name || username || "User"}
                </p>
                {username && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">@{username}</p>
                )}
              </div>
              {user && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <AiJobsIndicator userId={user.id} />
                  <NotificationBell userId={user.id} />
                </div>
              )}
            </div>

            {/* View profile */}
            <Link
              href={username ? `/${username}` : "/dashboard/settings"}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <User aria-hidden className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.nav.viewProfile}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Middle: nav — grouped Account / Business / Settings. Non-first groups
          carry a divider + top spacing so the sections stay legibly separated,
          including in the collapsed rail where the text headers are hidden. */}
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {navGroups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn(
              "flex flex-col gap-0.5",
              groupIndex > 0 && "mt-2 pt-2 border-t border-sidebar-border/60"
            )}
          >
            {!collapsed ? (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2.5 pb-1">
                {group.label}
              </p>
            ) : (
              <span className="sr-only">{group.label}</span>
            )}
            {group.items.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon aria-hidden className={cn("h-4 w-4 shrink-0", active && "text-violet-600")} strokeWidth={active ? 2.5 : 2} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: theme, logout */}
      <div className="border-t border-sidebar-border p-2 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={mounted && theme === "dark" ? t.nav.switchLight : t.nav.switchDark}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center"
          )}
        >
          {mounted && theme === "dark" ? <Sun aria-hidden className="h-4 w-4 shrink-0" /> : <Moon aria-hidden className="h-4 w-4 shrink-0" />}
          {!collapsed && <span className="truncate">{mounted && theme === "dark" ? t.nav.switchLight : t.nav.switchDark}</span>}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title={t.nav.logout}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center"
          )}
        >
          <LogOut aria-hidden className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{t.nav.logout}</span>}
        </button>
      </div>
    </aside>
  );
}
