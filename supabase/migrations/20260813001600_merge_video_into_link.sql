-- Merge the "video" content type into "link".
--
-- The video builder was merged into the unified link builder in the app: new
-- video URLs are stored in the `url` column with content_type 'link', and the
-- space page decides embed-vs-iframe at render time via detectVideo(). This
-- backfills existing rows so nothing keeps content_type 'video' or a populated
-- video_url column — the video_url column itself is left in place (still read
-- as a defensive fallback) but is no longer written by any create/edit path.
--
-- Idempotent: re-running is a no-op once every video row has been converted.

update public.spaces
set
  url = coalesce(nullif(url, ''), video_url),
  video_url = null,
  content_type = 'link'
where
  content_type = 'video'
  or (content_type is null and video_url is not null);
