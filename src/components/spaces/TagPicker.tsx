"use client";

import type { Tag } from "@/lib/types";

interface TagPickerProps {
  availableTags: Tag[];
  selectedTag: Tag | null;
  onChange: (tag: Tag | null) => void;
}

export function TagPicker({ availableTags, selectedTag, onChange }: TagPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {availableTags.map((tag) => {
        const selected = selectedTag?.id === tag.id;
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onChange(selected ? null : tag)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${
              selected
                ? "bg-violet-100 dark:bg-violet-900/50 border-violet-400 dark:border-violet-600 text-violet-700 dark:text-violet-300"
                : "bg-transparent border-border/60 text-muted-foreground hover:border-violet-400/60 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
            }`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
