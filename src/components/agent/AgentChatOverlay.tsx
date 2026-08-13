"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Bot, LogIn } from "lucide-react";
import { AgentChat } from "./AgentChat";
import { buttonVariants } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface AgentChatOverlayProps {
  profile: Profile;
  isAuthenticated: boolean;
  open: boolean;
  onClose: () => void;
}

// Fullscreen chat overlay — the shared chrome (header + close + sign-in wall)
// around AgentChat. Extracted from the old AgentEmbed pill so any trigger
// (the widget-strip card today) can open the same overlay without duplicating
// this scroll-lock + layout logic.
export function AgentChatOverlay({ profile, isAuthenticated, open, onClose }: AgentChatOverlayProps) {
  const { t } = useLanguage();
  const displayName = profile.display_name || profile.username;

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-background flex flex-col"
      style={{ zIndex: 200, height: "100dvh" }}
    >
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex-shrink-0">
            <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-none">{t.agent.askUser.replace("{name}", displayName)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t.agent.aiAgentLabel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={t.agent.close}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col max-w-2xl w-full mx-auto">
        {isAuthenticated ? (
          <AgentChat
            username={profile.username}
            displayName={displayName}
            suggestedQuestions={profile.agent_suggested_questions ?? []}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/40">
              <LogIn className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t.agent.signInToChat.replace("{name}", displayName)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.agent.signInToChatDesc}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                {t.nav.login}
              </Link>
              <Link href="/login?tab=signup" className={buttonVariants({ size: "sm", variant: "outline" })}>
                {t.nav.signup}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
