-- Brand fields on profiles.
-- logo_url: business logo, separate from avatar_url (which stays the
--   personal/profile photo).
-- brand_colors: owner-picked palette, e.g. { "primary": "#...", "accent": "#..." }.
-- brand_values: short list of brand descriptors/values shown on the profile.
-- brand_description: longer freeform brand description (distinct from `bio`).
alter table public.profiles
  add column if not exists logo_url text,
  add column if not exists brand_colors jsonb not null default '{}'::jsonb,
  add column if not exists brand_values jsonb not null default '[]'::jsonb,
  add column if not exists brand_description text;
