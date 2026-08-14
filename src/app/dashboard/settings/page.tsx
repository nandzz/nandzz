"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ShieldCheck,
  CreditCard,
  Trash2,
  Globe,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { FEATURES } from "@/lib/flags";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { PhoneVerificationForm } from "@/components/auth/PhoneVerificationForm";
import type { Profile } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/i18n/translations";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale, setLocale } = useLanguage();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    };
    loadProfile();
  }, [supabase, router]);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setDeleteError(body.error || "Failed to delete account");
        return;
      }
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <p className="text-muted-foreground text-sm">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-violet-100/30 blur-3xl dark:bg-violet-950/15" />
      </div>

      <div className="mx-auto flex max-w-7xl justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <Tabs defaultValue="security" className="gap-6">
            <TabsList className="w-full">
              <TabsTrigger value="security" className="flex-1 gap-2">
                <ShieldCheck className="h-4 w-4" />
                {t.settings.tabSecurity}
              </TabsTrigger>
              {FEATURES.monetization && (
                <TabsTrigger value="billing" className="flex-1 gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t.settings.tabBilling}
                </TabsTrigger>
              )}
              <TabsTrigger value="preferences" className="flex-1 gap-2">
                <Globe className="h-4 w-4" />
                {t.settings.tabPreferences}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="security">
              <div className="space-y-6">
                <Card className="w-full shadow-lg shadow-black/5 dark:shadow-black/20 border-border/60">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{t.settings.securityPasswordTitle}</CardTitle>
                    <CardDescription>{t.settings.securityPasswordDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChangePasswordForm />
                  </CardContent>
                </Card>

                <Card className="w-full shadow-lg shadow-black/5 dark:shadow-black/20 border-border/60">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{t.settings.securityPhoneTitle}</CardTitle>
                    <CardDescription>
                      {t.settings.securityPhoneDesc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PhoneVerificationForm />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {FEATURES.monetization && (
              <TabsContent value="billing">
                <Card className="w-full shadow-lg shadow-black/5 dark:shadow-black/20 border-border/60">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{t.settings.billingTitle}</CardTitle>
                    <CardDescription>{t.settings.billingDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t.settings.billingPageDesc}
                    </p>
                    <div className="flex gap-3">
                      <a href="/dashboard/billing">
                        <button className="inline-flex items-center gap-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm font-medium shadow-sm shadow-violet-600/25 transition-colors">
                          <CreditCard className="h-4 w-4" />
                          {t.settings.billingViewPage}
                        </button>
                      </a>
                      <a href="/pricing">
                        <button className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background hover:bg-accent px-4 py-2 text-sm font-medium transition-colors">
                          {t.settings.billingViewPlans}
                        </button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="preferences">
              <Card className="w-full shadow-lg shadow-black/5 dark:shadow-black/20 border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{t.settings.preferencesTitle}</CardTitle>
                  <CardDescription>{t.settings.preferencesDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">{t.settings.languageLabel}</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.settings.languageHint}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SUPPORTED_LOCALES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLocale(lang)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                            locale === lang
                              ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-500/70"
                              : "border-border/60 bg-background hover:bg-accent hover:border-border text-foreground"
                          }`}
                        >
                          <span className="text-base leading-none">
                            {lang === "en" && "🇬🇧"}
                            {lang === "pt" && "🇧🇷"}
                            {lang === "fr" && "🇫🇷"}
                            {lang === "es" && "🇪🇸"}
                            {lang === "ja" && "🇯🇵"}
                            {lang === "de" && "🇩🇪"}
                            {lang === "it" && "🇮🇹"}
                          </span>
                          {LOCALE_LABELS[lang]}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Danger Zone */}
          <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-destructive">{t.settings.deleteAccountTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.settings.deleteAccountDesc}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setDeleteDialogOpen(true);
                  setDeleteConfirm("");
                  setDeleteError("");
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t.settings.deleteAccountButton}
              </Button>
            </div>
          </div>

          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            title={t.settings.deleteDialogTitle}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const [before, after] = t.settings.deleteDialogDesc.split("{username}");
                  return <>{before}<span className="font-mono font-semibold text-foreground">{profile.username}</span>{after}</>;
                })()}
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={profile.username}
                className="w-full rounded-md border border-border/60 bg-muted/50 px-3 py-2 text-sm focus:border-destructive/50 focus:outline-none focus:ring-1 focus:ring-destructive/30"
              />
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleteLoading}
                >
                  {t.settings.deleteDialogCancel}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteConfirm !== profile.username || deleteLoading}
                  onClick={handleDeleteAccount}
                >
                  {deleteLoading ? t.settings.deleting : t.settings.deleteDialogConfirm}
                </Button>
              </div>
            </div>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
