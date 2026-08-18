"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadMyProfile } from "@/features/profile";
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
  Globe,
} from "lucide-react";
import { FEATURES } from "@/lib/flags";
import {
  ChangePasswordForm,
  PhoneVerificationForm,
  DeleteAccount,
} from "@/features/auth";
import type { Profile } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/i18n/translations";

export default function SettingsPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();

  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const result = await loadMyProfile();
      if (!result.ok) {
        router.push("/login");
        return;
      }
      if (result.profile) setProfile(result.profile);
    };
    loadProfile();
  }, [router]);

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

          <DeleteAccount username={profile.username} />
        </div>
      </div>
    </div>
  );
}
