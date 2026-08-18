"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Moon, Sun, Menu, User, UserPlus, Settings, LogOut, CreditCard, Plug, Blocks, Calendar, Users, BarChart3, Palette } from "lucide-react";
import type { Profile } from "@/lib/types";
import { FEATURES } from "@/lib/flags";
import { usePlanEntitlements } from "@/lib/plan-client";
import { NotificationBell } from "./NotificationBell";
import { AiJobsIndicator } from "./AiJobsIndicator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChrome } from "@/contexts/ChromeContext";
import { cn } from "@/lib/utils";
import { getSessionUser, onAuthChange, signOutUser, fetchProfileFull } from "../auth";

export function Navbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { isHidden } = useChrome();
  const entitlements = usePlanEntitlements();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const data = await fetchProfileFull(userId);
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

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setProfile(null);
    router.refresh();
  };

  return (
    <nav
      aria-hidden={isHidden || undefined}
      className={cn(
        "sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
        "transition-transform duration-300 ease-out motion-reduce:transition-none will-change-transform",
        isHidden && "max-md:-translate-y-full max-md:pointer-events-none"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-0 group">
            <span className="text-xl font-bold tracking-tight">nand</span>
            <span className="text-xl font-bold tracking-tight text-violet-600 transition-colors group-hover:text-violet-500">zz</span>
          </Link>

          {/* Nav links - desktop */}
          <div className="hidden items-center gap-1 md:flex">
            {user && FEATURES.monetization && (
              <Link
                href="/pricing"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {t.nav.pricing}
              </Link>
            )}
            {user && (
              <Link
                href="/dashboard/feed"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {t.nav.feed}
              </Link>
            )}
            {user && (
              <Link
                href="/dashboard/contents/create-space"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {t.nav.create}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              {FEATURES.widgets && entitlements.hasWidgets && (
                <Link
                  href="/dashboard/widgets"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Blocks className="h-3.5 w-3.5" />
                  Widgets
                </Link>
              )}
              <Link
                href="/dashboard/contents"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {t.nav.mySpaces}
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t.nav.login}
                </Button>
              </Link>
              <Link href="/login?tab=signup">
                <Button size="sm">
                  {t.nav.signup}
                </Button>
              </Link>
            </div>
          )}

          {/* AI jobs indicator + notification bell */}
          {user && <AiJobsIndicator userId={user.id} />}
          {user && <NotificationBell userId={user.id} />}

          {/* Avatar dropdown — desktop only, after the bell */}
          {user && (
            <div className="hidden md:flex">
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="Account menu" className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer transition-transform hover:scale-105">
                  <Avatar className="h-8 w-8 border-2 border-transparent hover:border-violet-500/50 transition-colors">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || profile?.username || "User avatar"} />
                    <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-sm font-medium">
                      {profile?.display_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || profile?.username || "User avatar"} />
                          <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs font-semibold">
                            {profile?.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none truncate">
                            {profile?.display_name || profile?.username || "User"}
                          </p>
                          {profile?.username && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              @{profile.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    {profile?.username && (
                      <DropdownMenuItem render={<Link href={`/${profile.username}`} />} className="gap-2">
                        <User aria-hidden className="h-4 w-4 text-muted-foreground" />
                        {t.nav.profile}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem render={<Link href="/dashboard/settings" />} className="gap-2">
                      <Settings aria-hidden className="h-4 w-4 text-muted-foreground" />
                      {t.nav.settings}
                    </DropdownMenuItem>
                    {entitlements.hasMcp && (
                      <DropdownMenuItem render={<Link href="/mcp" />} className="gap-2">
                        <Plug aria-hidden className="h-4 w-4 text-muted-foreground" />
                        {t.nav.mcp}
                      </DropdownMenuItem>
                    )}
                    {FEATURES.monetization && (
                      <DropdownMenuItem render={<Link href="/dashboard/credits" />} className="gap-2">
                        <CreditCard aria-hidden className="h-4 w-4 text-muted-foreground" />
                        Subscription
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="gap-2">
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Moon className="h-4 w-4 text-muted-foreground" />
                      )}
                      {theme === "dark" ? t.nav.switchLight : t.nav.switchDark}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                    {t.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile menu button */}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Open menu" className="h-9 w-9 md:hidden inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
              <Menu className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  {/* User info */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || profile?.username || "User avatar"} />
                          <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs font-semibold">
                            {profile?.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none truncate">
                            {profile?.display_name || profile?.username || "User"}
                          </p>
                          {profile?.username && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              @{profile.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  {/* Account — Feed/Contents/Profile live in the bottom tab bar */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.nav.groupAccount}
                    </DropdownMenuLabel>
                    <DropdownMenuItem render={<Link href="/dashboard/bookings" />} className="gap-2">
                      <Calendar aria-hidden className="h-4 w-4 text-muted-foreground" />
                      {t.nav.bookings}
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/dashboard/followers" />} className="gap-2">
                      <Users aria-hidden className="h-4 w-4 text-muted-foreground" />
                      {t.nav.followers}
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/dashboard/following" />} className="gap-2">
                      <UserPlus aria-hidden className="h-4 w-4 text-muted-foreground" />
                      {t.nav.following}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  {/* Business */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.nav.groupBusiness}
                    </DropdownMenuLabel>
                    {FEATURES.widgets && entitlements.hasWidgets && (
                      <DropdownMenuItem render={<Link href="/dashboard/widgets" />} className="gap-2">
                        <Blocks aria-hidden className="h-4 w-4 text-muted-foreground" />
                        Widgets
                      </DropdownMenuItem>
                    )}
                    {FEATURES.brand && (
                      <DropdownMenuItem render={<Link href="/dashboard/brand" />} className="gap-2">
                        <Palette aria-hidden className="h-4 w-4 text-muted-foreground" />
                        Brand
                      </DropdownMenuItem>
                    )}
                    {entitlements.hasAnalytics && (
                      <DropdownMenuItem render={<Link href="/dashboard/analytics" />} className="gap-2">
                        <BarChart3 aria-hidden className="h-4 w-4 text-muted-foreground" />
                        {t.nav.analytics}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  {/* Settings */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.nav.groupSettings}
                    </DropdownMenuLabel>
                    <DropdownMenuItem render={<Link href="/dashboard/settings" />} className="gap-2">
                      <Settings aria-hidden className="h-4 w-4 text-muted-foreground" />
                      {t.nav.settings}
                    </DropdownMenuItem>
                    {FEATURES.monetization && (
                      <DropdownMenuItem render={<Link href="/dashboard/credits" />} className="gap-2">
                        <CreditCard aria-hidden className="h-4 w-4 text-muted-foreground" />
                        Subscription
                      </DropdownMenuItem>
                    )}
                    {entitlements.hasMcp && (
                      <DropdownMenuItem render={<Link href="/mcp" />} className="gap-2">
                        <Plug aria-hidden className="h-4 w-4 text-muted-foreground" />
                        {t.nav.mcp}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="gap-2">
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    )}
                    {theme === "dark" ? t.nav.switchLight : t.nav.switchDark}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                    {t.nav.logout}
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem render={<Link href="/login" />} className="gap-2">
                    <User aria-hidden className="h-4 w-4 text-muted-foreground" />
                    {t.nav.login}
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/login?tab=signup" />} className="gap-2">
                    <UserPlus aria-hidden className="h-4 w-4 text-muted-foreground" />
                    {t.nav.signup}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
