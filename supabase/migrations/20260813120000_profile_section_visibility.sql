-- Per-profile public visibility for the three content sections.
-- The owner manages these from the contents dashboard (the gear next to the
-- section tabs). Each flag gates whether that section renders on the public
-- profile page:
--   show_contents -> the "Content" section (ai / pdf / notes / html spaces)
--   show_gallery  -> the image gallery grid
--   show_links    -> the "Links" section (link / video spaces)
-- The dashboard always shows every section to the owner; these only affect
-- what visitors see. Default true so existing profiles are unchanged.
alter table public.profiles
  add column if not exists show_contents boolean not null default true,
  add column if not exists show_gallery  boolean not null default true,
  add column if not exists show_links    boolean not null default true;
