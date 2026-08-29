"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ProfileAddress } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

// Google Places API (New) — called directly from the browser. The key is a
// NEXT_PUBLIC var protected by HTTP-referrer restrictions on the GCP side; if
// it's unset the field silently degrades to a plain free-text address input.
const PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const MIN_QUERY = 3;
const DEBOUNCE_MS = 300;

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

interface AddressAutocompleteProps {
  value: ProfileAddress | null;
  onChange: (address: ProfileAddress | null) => void;
  placeholder?: string;
  id?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  id,
}: AddressAutocompleteProps) {
  const { locale } = useLanguage();
  const [query, setQuery] = useState(value?.formatted ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // One Places session token spans all keystrokes up to a selection; resetting it
  // after a pick starts a fresh billable session (keeps autocomplete cheap).
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const abortRef = useRef<AbortController | null>(null);

  // Close the dropdown on any outside pointer press.
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Debounced autocomplete fetch. No-op without a key (plain-text fallback).
  // All state updates live inside the timer callback (async) so the effect body
  // itself never calls setState synchronously.
  useEffect(() => {
    if (!PLACES_KEY) return;
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < MIN_QUERY) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(AUTOCOMPLETE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": PLACES_KEY,
          },
          body: JSON.stringify({
            input: q,
            sessionToken: sessionTokenRef.current,
            languageCode: locale,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.warn("[address] Places autocomplete failed", res.status, body);
          throw new Error(String(res.status));
        }
        const data = await res.json();
        const next: Suggestion[] = (data.suggestions ?? [])
          .map((s: { placePrediction?: unknown }) => s.placePrediction)
          .filter(Boolean)
          .map(
            (p: {
              placeId: string;
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
              text?: { text?: string };
            }) => ({
              placeId: p.placeId,
              mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
              secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
            }),
          );
        setSuggestions(next);
        setOpen(next.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.warn("[address] Places request error", err);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, locale]);

  // Keep the parent in sync with the typed text so free text still persists
  // (and still deep-links to Maps) even when no suggestion is picked.
  const handleInput = (text: string) => {
    setQuery(text);
    onChange(text.trim() ? { formatted: text } : null);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    onChange(null);
  };

  const handleSelect = async (s: Suggestion) => {
    setOpen(false);
    setQuery(s.mainText);
    // Optimistically persist the label; enrich with details below.
    onChange({ formatted: [s.mainText, s.secondaryText].filter(Boolean).join(", ") });
    if (!PLACES_KEY) return;
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${s.placeId}?languageCode=${locale}&sessionToken=${sessionTokenRef.current}`,
        {
          headers: {
            "X-Goog-Api-Key": PLACES_KEY,
            "X-Goog-FieldMask": "id,formattedAddress,location",
          },
        },
      );
      if (res.ok) {
        const d = await res.json();
        setQuery(d.formattedAddress ?? s.mainText);
        onChange({
          formatted:
            d.formattedAddress ??
            [s.mainText, s.secondaryText].filter(Boolean).join(", "),
          place_id: d.id ?? s.placeId,
          lat: d.location?.latitude,
          lng: d.location?.longitude,
        });
      }
    } catch {
      // Keep the optimistic value; details are a best-effort enrichment.
    } finally {
      // Selection closes the billing session — start a new token next time.
      sessionTokenRef.current = crypto.randomUUID();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-0 rounded-md border border-border/60 bg-background overflow-hidden focus-within:border-violet-500/50 transition-colors">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-r border-border/60 bg-muted/50 text-muted-foreground">
          <MapPin className="h-4 w-4" />
        </span>
        <Input
          id={id}
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInput(e.target.value.slice(0, 300))}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            // Let Escape dismiss the dropdown without closing the whole dialog.
            if (e.key === "Escape" && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          maxLength={300}
          autoComplete="off"
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear address"
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border/60 bg-background shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.mainText}</span>
                  {s.secondaryText && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.secondaryText}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
