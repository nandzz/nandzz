export type GradientKey =
  | "violet"
  | "rose"
  | "sky"
  | "emerald"
  | "amber"
  | "indigo"
  | "pink"
  | "teal";

export const PREVIEW_GRADIENTS: Record<
  GradientKey,
  {
    label: string;
    /** Full Tailwind bg + dark classes — must remain as complete string literals for scanner */
    bg: string;
    /** Full Tailwind text + dark classes */
    text: string;
    /** CSS gradient for color swatch (inline style, no Tailwind needed) */
    swatch: string;
  }
> = {
  violet: {
    label: "Violet",
    bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950 dark:to-violet-900",
    text: "text-violet-300 dark:text-violet-700",
    swatch: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  },
  rose: {
    label: "Rose",
    bg: "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950 dark:to-rose-900",
    text: "text-rose-300 dark:text-rose-700",
    swatch: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
  },
  sky: {
    label: "Sky",
    bg: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950 dark:to-sky-900",
    text: "text-sky-300 dark:text-sky-700",
    swatch: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
  },
  emerald: {
    label: "Emerald",
    bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900",
    text: "text-emerald-300 dark:text-emerald-700",
    swatch: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
  },
  amber: {
    label: "Amber",
    bg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900",
    text: "text-amber-300 dark:text-amber-700",
    swatch: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
  },
  indigo: {
    label: "Indigo",
    bg: "bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-950 dark:to-indigo-900",
    text: "text-indigo-300 dark:text-indigo-700",
    swatch: "linear-gradient(135deg, #818cf8 0%, #4338ca 100%)",
  },
  pink: {
    label: "Pink",
    bg: "bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-950 dark:to-pink-900",
    text: "text-pink-300 dark:text-pink-700",
    swatch: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)",
  },
  teal: {
    label: "Teal",
    bg: "bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-950 dark:to-teal-900",
    text: "text-teal-300 dark:text-teal-700",
    swatch: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
  },
};

export const GRADIENT_KEYS = Object.keys(PREVIEW_GRADIENTS) as GradientKey[];
export const DEFAULT_GRADIENT: GradientKey = "violet";

export function getGradient(key: string | null | undefined) {
  return PREVIEW_GRADIENTS[(key as GradientKey) ?? DEFAULT_GRADIENT] ?? PREVIEW_GRADIENTS[DEFAULT_GRADIENT];
}
