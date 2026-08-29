"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * A password field with a show/hide toggle. Wraps the shared `Input`, adds a
 * trailing eye button that flips the field between `password` and `text`, and
 * keeps the toggle's accessible name localized (t.common.show/hidePassword).
 * Drop-in for any `<Input type="password" />` — pass the same props.
 */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const { t } = useLanguage();
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t.common.hidePassword : t.common.showPassword}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
