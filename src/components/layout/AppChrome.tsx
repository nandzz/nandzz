"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar, Sidebar, MobileTabBar } from "@/features/analytics";
import { onAuthChange, fetchProfileLite } from "@/features/analytics/auth";
import { ConditionalFooter } from "./ConditionalFooter";
import { isImmersiveRoute, isProfilePage, isWidgetRoute } from "@/lib/layout/appShell";
import { cn } from "@/lib/utils";
import type { ProfileLite } from "@/lib/types";

const COLLAPSE_STORAGE_KEY = "sidebar:collapsed";

interface AppChromeProps {
  initialUserId: string | null;
  initialProfile: ProfileLite | null;
  children: React.ReactNode;
}

export function AppChrome({ initialUserId, initialProfile, children }: AppChromeProps) {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [profile, setProfile] = useState<ProfileLite | null>(initialProfile);
  const [collapsed, setCollapsed] = useState(false);

  const fetchProfile = useCallback(async (uid: string) => {
    const data = await fetchProfileLite(uid);
    if (data) setProfile(data);
  }, []);

  useEffect(() => {
    return onAuthChange((u) => {
      if (u) {
        setUserId(u.id);
        fetchProfile(u.id);
      } else {
        setUserId(null);
        setProfile(null);
      }
    });
  }, [fetchProfile]);

  useEffect(() => {
    const handler = () => {
      if (userId) fetchProfile(userId);
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [userId, fetchProfile]);

  const onProfilePage = isProfilePage(pathname);
  // The public booking widget is a self-contained, branded page: it renders its
  // own hero and controls, so every piece of app chrome is suppressed.
  const onWidgetPage = isWidgetRoute(pathname);
  // The immersive space viewer renders its own top bar (back / title / actions),
  // so the app Navbar is suppressed there too — leaving the viewer chromeless
  // above its own header.
  const onImmersivePage = isImmersiveRoute(pathname);

  useEffect(() => {
    // Auto-collapse to the rail when landing on a profile page (full-width
    // profile); restore the saved preference on any other page. Reads happen
    // after mount — localStorage isn't available during SSR, so server and
    // client both start "expanded", trading a one-frame flip for zero
    // hydration mismatch. The toggle can still override for the current visit.
    if (onProfilePage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    } else {
      const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(stored === "true");
    }
  }, [onProfilePage]);

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      // Persist the preference only on normal pages. On a profile page the
      // collapse is an ephemeral default, so toggling it back open doesn't
      // change the saved preference used elsewhere.
      if (!isProfilePage(pathname)) {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      }
      return next;
    });
  }, [pathname]);

  // When signed in, the sidebar is the app chrome everywhere except the
  // immersive space viewer (which keeps its own chrome-hide gesture).
  const showSidebar = !!userId && !isImmersiveRoute(pathname);

  return (
    <>
      {showSidebar && (
        <Sidebar collapsed={collapsed} onToggle={handleToggleCollapsed} initialProfile={profile} />
      )}

      {/* Top Navbar only when the sidebar isn't taking over (logged out). On
          mobile it stays visible since the sidebar is desktop-only. Profile,
          widget, and immersive space pages never show the Navbar — they render
          their own chrome. */}
      {!onProfilePage && !onWidgetPage && !onImmersivePage && (
        <div className={cn(showSidebar && "md:hidden")}>
          <Navbar />
        </div>
      )}

      <main
        className={cn(
          "flex-1 md:pb-0 transition-[padding] duration-300 ease-out motion-reduce:transition-none",
          (!userId && onProfilePage) || onWidgetPage ? "pb-0" : "pb-16",
          showSidebar && (collapsed ? "md:pl-16" : "md:pl-64")
        )}
      >
        {children}
      </main>

      {!showSidebar && !onWidgetPage && <ConditionalFooter />}

      {/* Hidden for logged-out visitors on a profile page, and on the widget
          page (which owns its whole viewport). */}
      {!(!userId && onProfilePage) && !onWidgetPage && <MobileTabBar />}
    </>
  );
}
