-- ── Profile address (business location) ─────────────────────────────────────
--
-- WHY: business profiles (salons, studios, clinics …) want to publish a physical
-- address on their public page so visitors can tap through to Google Maps. The
-- editor uses Google Places Autocomplete, which returns not just a formatted
-- string but a stable place_id and coordinates — worth persisting so the public
-- "open in Maps" link pins the exact place (query_place_id) and future features
-- (embedded map, distance) have lat/lng without re-geocoding.
--
-- Shape (JSONB, nullable — no address is the default):
--   { "formatted": string, "place_id"?: string, "lat"?: number, "lng"?: number }
--
-- A single JSONB column keeps the four related fields together and lets the
-- existing `select("*")` profile fetch pick it up with no query changes.

alter table public.profiles
  add column if not exists address jsonb;

comment on column public.profiles.address is
  'Optional business address for the public profile. JSONB: { formatted, place_id?, lat?, lng? }. Set via the profile editor (Google Places Autocomplete).';
