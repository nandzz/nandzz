-- Per-profile layout + ordering for the public profile's three sections.
--
-- Layout: the owner already picks a `gallery_layout` for the image gallery.
-- These add the same choice to the two other sections:
--   contents_layout -> the "Publications" section (ai / pdf / notes / html)
--   links_layout    -> the "Links" section (link / video)
-- Card/chip sections don't offer the image-only 'masonry' layout, so their
-- valid values are: 'carousel' | 'grid' | 'justified' | 'featured'. Default
-- 'carousel' matches the horizontal shelf they shipped with, so existing
-- profiles look unchanged. Plain text (not an enum) to match the codebase's
-- loose-string convention for `spaces.content_type` / `gallery_layout`.
--
-- Order: which of the three sections renders first / second / third on the
-- public profile. The owner drags them into order on their own profile. Stored
-- as an ordered text[] of section ids ('gallery' | 'publications' | 'links');
-- the app tolerates missing/extra/unknown ids. Default keeps today's order.
alter table public.profiles
  add column if not exists contents_layout text not null default 'carousel',
  add column if not exists links_layout    text not null default 'carousel',
  add column if not exists section_order    text[] not null
    default array['gallery', 'publications', 'links'];
