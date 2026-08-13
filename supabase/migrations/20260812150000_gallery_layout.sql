-- Per-profile gallery layout preference.
-- The public profile now renders image-type spaces in a dedicated gallery grid
-- (separate from the content carousel). The owner picks how that grid is laid
-- out and the choice is persisted here so every visitor sees the same
-- arrangement. Plain text (not an enum) to match the codebase's existing
-- loose-string convention for `spaces.content_type`.
-- Valid values: 'grid' | 'masonry' | 'justified' | 'featured'.
alter table public.profiles
  add column if not exists gallery_layout text not null default 'grid';
