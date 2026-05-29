import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Nandzz logo" width={28} height={29} style={{ height: "auto" }} className="rounded-md" />
              <span className="font-semibold">nandzz</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              A platform for saving and sharing AI-generated web apps with the
              world.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Platform
              </span>
              <Link
                href="/explore"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Explore
              </Link>
              <Link
                href="/login?tab=signup"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Get Started
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Legal
              </span>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/cookies"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground/70">
            &copy; {new Date().getFullYear()} nandzz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
