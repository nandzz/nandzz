-- ── HOTFIX: create_booking_tx entitlement gate ──────────────────────────────
-- 20260823120000 (email-optional) was copied from the address-aware migration
-- 20260819140000, whose body still called the RETIRED public.has_widget_access()
-- — dropped in the billing overhaul (20260816120300). The live function had
-- diverged from those files (it correctly gated on user_has_entitlement), so
-- re-issuing the migration body reintroduced the dead call and broke every
-- booking with `function public.has_widget_access(uuid) does not exist`.
--
-- This re-issues create_booking_tx with the correct plan-based entitlement gate
-- (public.user_has_entitlement(owner, 'widgets')), keeping the email-optional
-- behavior. Body is otherwise identical to 20260823120000.

create or replace function public.create_booking_tx(
  p_instance_id     uuid,
  p_service_id      text,
  p_starts_at       timestamptz,
  p_customer_name   text,
  p_customer_email  text,
  p_customer_phone  text default null,
  p_notes           text default null,
  p_created_by      uuid default null,
  p_staff_id        text default null,
  p_location_id     text default null,
  p_service_ids     text[] default null,
  p_customer_address text default null
)
returns public.widget_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instance    public.widget_instances%rowtype;
  v_config      jsonb;
  v_tz          text;
  v_location    jsonb;
  v_location_name text;
  v_availability  jsonb;
  v_blackout_dates jsonb;
  v_services_src  jsonb;
  v_staff_src     jsonb;
  v_ids           text[];
  v_id            text;
  v_service     jsonb;
  v_svc_arr     jsonb := '[]'::jsonb;   -- resolved service jsonbs, in order
  v_svc_snapshot jsonb := '[]'::jsonb;  -- per-service breakdown for the column
  v_names       text[] := array[]::text[];
  v_duration    int := 0;               -- summed duration
  v_svc_dur     int;
  v_svc_price   int;
  v_price       int := null;            -- summed price (null until a price seen)
  v_service_id  text;                   -- primary (first) service id
  v_service_name text;                  -- combined display name
  v_ends_at     timestamptz;
  v_local       timestamp;   -- wall-clock time in the resolved tz
  v_dow         text;
  v_dow_names   text[] := array['mon','tue','wed','thu','fri','sat','sun'];
  v_start_min   int;
  v_end_min     int;
  v_window      jsonb;
  v_win_start   int;
  v_win_end     int;
  v_fits        boolean := false;
  v_date_str    text;
  v_staff_all   jsonb;
  v_req_staff   text;
  v_staff       jsonb;
  v_candidates  jsonb := '[]'::jsonb;
  v_cand        jsonb;
  v_booking     public.widget_bookings%rowtype;
begin
  -- Name is the only required contact field. Email is optional (blank ⇒ stored
  -- as '' below); phone requirement, when any, is enforced at the /book route.
  if trim(coalesce(p_customer_name, '')) = '' then
    raise exception 'MISSING_CUSTOMER' using errcode = 'P0001';
  end if;

  select * into v_instance from public.widget_instances where id = p_instance_id;
  if not found or not v_instance.enabled then
    raise exception 'WIDGET_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- Widget entitlement is a plan feature keyed on the instance owner. (The old
  -- per-instance has_widget_access() was dropped in the billing overhaul —
  -- 20260816120300 — so this must gate on user_has_entitlement instead.)
  if not coalesce(public.user_has_entitlement(v_instance.user_id, 'widgets'), false) then
    raise exception 'NO_ACCESS' using errcode = 'P0001';
  end if;

  v_config := coalesce(v_instance.config, '{}'::jsonb);

  -- Resolve the location subtree (if requested) up front — everything below
  -- reads from it instead of the top-level config when it's present. This is
  -- the ONLY branch point; p_location_id null keeps the exact legacy path.
  if p_location_id is not null then
    select elem into v_location
    from jsonb_array_elements(coalesce(v_config->'locations', '[]'::jsonb)) elem
    where elem->>'id' = p_location_id
    limit 1;

    if v_location is null then
      raise exception 'INVALID_LOCATION' using errcode = 'P0001';
    end if;

    v_location_name  := v_location->>'name';
    v_tz             := coalesce(nullif(v_location->>'timezone', ''), nullif(v_config->>'timezone', ''), 'UTC');
    v_availability   := coalesce(v_location->'availability', '{}'::jsonb);
    v_blackout_dates := coalesce(v_location->'blackout_dates', '[]'::jsonb);
    v_services_src   := coalesce(v_location->'services', '[]'::jsonb);
    v_staff_src      := coalesce(v_location->'staff', '[]'::jsonb);
  else
    v_tz             := coalesce(nullif(v_config->>'timezone', ''), 'UTC');
    v_availability   := coalesce(v_config->'availability', '{}'::jsonb);
    v_blackout_dates := coalesce(v_config->'blackout_dates', '[]'::jsonb);
    v_services_src   := coalesce(v_config->'services', '[]'::jsonb);
    v_staff_src      := coalesce(v_config->'staff', '[]'::jsonb);
  end if;

  -- Effective service id list: the explicit multi-select array when given,
  -- else the single p_service_id (legacy / MCP path). Empty array ⇒ fall back
  -- to p_service_id too.
  if p_service_ids is not null and array_length(p_service_ids, 1) >= 1 then
    v_ids := p_service_ids;
  else
    v_ids := array[p_service_id];
  end if;

  -- Resolve every selected service, summing duration + price and collecting the
  -- names and per-service snapshot. Each id must resolve to a service with a
  -- positive duration, else the whole booking is rejected.
  foreach v_id in array v_ids
  loop
    select elem into v_service
    from jsonb_array_elements(v_services_src) elem
    where elem->>'id' = v_id
    limit 1;

    if v_service is null then
      raise exception 'INVALID_SERVICE' using errcode = 'P0001';
    end if;

    v_svc_dur := coalesce((v_service->>'duration_min')::int, 0);
    if v_svc_dur <= 0 then
      raise exception 'INVALID_SERVICE' using errcode = 'P0001';
    end if;

    v_svc_price := nullif(v_service->>'price_cents', '')::int;

    v_duration := v_duration + v_svc_dur;
    if v_svc_price is not null then
      v_price := coalesce(v_price, 0) + v_svc_price;
    end if;
    v_names := v_names || (v_service->>'name');
    v_svc_arr := v_svc_arr || jsonb_build_array(v_service);
    v_svc_snapshot := v_svc_snapshot || jsonb_build_array(jsonb_build_object(
      'service_id', v_id,
      'name', v_service->>'name',
      'duration_min', v_svc_dur,
      'price_cents', v_svc_price
    ));
  end loop;

  v_service_id   := v_ids[1];
  v_service_name := array_to_string(v_names, ' + ');
  v_ends_at      := p_starts_at + make_interval(mins => v_duration);

  -- Store the breakdown only for genuine multi-service bookings; single-service
  -- bookings leave `services` null (byte-for-byte legacy rows).
  if array_length(v_ids, 1) <= 1 then
    v_svc_snapshot := null;
  end if;

  -- Wall-clock local time in the resolved timezone.
  v_local     := p_starts_at at time zone v_tz;
  v_dow       := v_dow_names[extract(isodow from v_local)::int];
  v_start_min := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  v_end_min   := v_start_min + v_duration;
  v_date_str  := to_char(v_local::date, 'YYYY-MM-DD');

  -- Business (or location) blackout dates.
  if v_blackout_dates ? v_date_str then
    raise exception 'BLACKOUT' using errcode = 'P0001';
  end if;

  -- Must fit fully inside one of the day's business (or location) hours — using
  -- the SUMMED duration so a multi-service booking reserves the whole span.
  for v_window in
    select * from jsonb_array_elements(coalesce(v_availability->v_dow, '[]'::jsonb))
  loop
    v_win_start := split_part(v_window->>0, ':', 1)::int * 60 + split_part(v_window->>0, ':', 2)::int;
    v_win_end   := split_part(v_window->>1, ':', 1)::int * 60 + split_part(v_window->>1, ':', 2)::int;
    if v_start_min >= v_win_start and v_end_min <= v_win_end then
      v_fits := true;
      exit;
    end if;
  end loop;

  if not v_fits then
    raise exception 'OUT_OF_HOURS' using errcode = 'P0001';
  end if;

  v_staff_all := v_staff_src;

  -- ── No staff configured (in the resolved scope): single-resource insert. ───
  if jsonb_array_length(v_staff_all) = 0 then
    begin
      insert into public.widget_bookings (
        instance_id, owner_user_id, service_id, service_name, duration_min, price_cents,
        starts_at, ends_at, customer_name, customer_email, customer_phone, customer_address, notes,
        manage_token, created_by_user_id, location_id, location_name, services
      ) values (
        p_instance_id, v_instance.user_id, v_service_id, v_service_name, v_duration, v_price,
        p_starts_at, v_ends_at, p_customer_name, coalesce(p_customer_email, ''), p_customer_phone, p_customer_address, p_notes,
        encode(extensions.gen_random_bytes(16), 'hex'), p_created_by,
        p_location_id, v_location_name, v_svc_snapshot
      )
      returning * into v_booking;
    exception when exclusion_violation then
      raise exception 'SLOT_TAKEN' using errcode = 'P0001';
    end;

    return v_booking;
  end if;

  -- ── Staffed: build the eligible + available candidate list. ────────────────
  -- A candidate must be eligible for EVERY selected service. A service with no
  -- (or empty) staff_ids is performable by anyone, so it never excludes.
  v_req_staff := nullif(p_staff_id, '');               -- '' ⇒ "Any available"

  for v_staff in select * from jsonb_array_elements(v_staff_all)
  loop
    -- Service eligibility across all selected services (intersection).
    if exists (
      select 1
      from jsonb_array_elements(v_svc_arr) svc
      where jsonb_typeof(svc->'staff_ids') = 'array'
        and jsonb_array_length(svc->'staff_ids') > 0
        and not (svc->'staff_ids' ? (v_staff->>'id'))
    ) then
      continue;
    end if;

    -- Specific staff requested ⇒ only that one.
    if v_req_staff is not null and (v_staff->>'id') <> v_req_staff then
      continue;
    end if;

    -- Personal day off.
    if coalesce(v_staff->'blackout_dates', '[]'::jsonb) ? v_date_str then
      continue;
    end if;

    -- Must be working a window covering the (summed) slot on this weekday.
    if not exists (
      select 1
      from jsonb_array_elements(coalesce(v_staff->'availability'->v_dow, '[]'::jsonb)) w
      where split_part(w->>0, ':', 1)::int * 60 + split_part(w->>0, ':', 2)::int <= v_start_min
        and v_end_min <= split_part(w->>1, ':', 1)::int * 60 + split_part(w->>1, ':', 2)::int
    ) then
      continue;
    end if;

    v_candidates := v_candidates
      || jsonb_build_array(jsonb_build_object('id', v_staff->>'id', 'name', v_staff->>'name'));
  end loop;

  if jsonb_array_length(v_candidates) = 0 then
    raise exception 'STAFF_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- Try each candidate; the exclusion constraint rejects a staff already booked
  -- for an overlapping range, so we fall through to the next free candidate.
  for v_cand in select * from jsonb_array_elements(v_candidates)
  loop
    begin
      insert into public.widget_bookings (
        instance_id, owner_user_id, service_id, service_name, duration_min, price_cents,
        starts_at, ends_at, customer_name, customer_email, customer_phone, customer_address, notes,
        manage_token, created_by_user_id, staff_id, staff_name, location_id, location_name, services
      ) values (
        p_instance_id, v_instance.user_id, v_service_id, v_service_name, v_duration, v_price,
        p_starts_at, v_ends_at, p_customer_name, coalesce(p_customer_email, ''), p_customer_phone, p_customer_address, p_notes,
        encode(extensions.gen_random_bytes(16), 'hex'), p_created_by,
        v_cand->>'id', v_cand->>'name', p_location_id, v_location_name, v_svc_snapshot
      )
      returning * into v_booking;

      return v_booking;
    exception when exclusion_violation then
      -- This staff member was just taken for the slot; try the next candidate.
      continue;
    end;
  end loop;

  -- Every eligible candidate is now booked for this slot.
  raise exception 'SLOT_TAKEN' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_booking_tx(uuid, text, timestamptz, text, text, text, text, uuid, text, text, text[], text) from public;
grant execute on function public.create_booking_tx(uuid, text, timestamptz, text, text, text, text, uuid, text, text, text[], text) to service_role;
