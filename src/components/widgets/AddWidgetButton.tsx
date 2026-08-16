"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

// Adds a widget instance to the owner's profile (no checkout — widgets are
// unlocked by the plan) and navigates to its studio.
export function AddWidgetButton({
  catalogId,
  label,
  className,
}: {
  catalogId: string;
  label?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/widgets/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog_id: catalogId }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        setError(t.booking.errorCouldNotSave);
        setLoading(false);
        return;
      }
      router.push(`/dashboard/widgets/${data.id}`);
      router.refresh();
    } catch {
      setError(t.booking.errorCouldNotSave);
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button onClick={add} disabled={loading} size="sm">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {label ?? t.booking.addWidgetButton}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
