-- ── Customers tab: server-side per-customer rollup ───────────────────────────
-- The widget dashboard used to ship every booking row to the browser and roll
-- customers up client-side (buildCustomers). That breaks past ~1000 bookings
-- (PostgREST's max-rows cap silently truncated the fetch) and is wasteful at any
-- real volume. This RPC does the rollup in the database and returns only the
-- customer rows, keyed by email — or `phone:<phone>` for a phone-in customer
-- with no email — exactly matching the old client grouping.
--
-- Security: SECURITY DEFINER so it can read the owner's bookings, gated by an
-- explicit auth.uid() = owner check (mirrors the widget_bookings owner RLS).
-- Location scope uses IS NOT DISTINCT FROM so a null p_location_id (legacy,
-- location-less instances) matches the null-location rows.

create or replace function public.widget_customers_summary(
  p_instance_id uuid,
  p_location_id text default null
)
returns table (
  id            text,
  email         text,
  name          text,
  phone         text,
  bookings      int,
  upcoming      int,
  cancelled     int,
  revenue_cents bigint,
  last_visit    timestamptz,
  next_visit    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Owner-only: the caller must own the instance (matches widget_bookings RLS).
  if not exists (
    select 1 from public.widget_instances wi
    where wi.id = p_instance_id and wi.user_id = auth.uid()
  ) then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  return query
  with base as (
    select
      coalesce(
        nullif(lower(trim(b.customer_email)), ''),
        'phone:' || nullif(trim(b.customer_phone), '')
      ) as key,
      b.*
    from public.widget_bookings b
    where b.instance_id = p_instance_id
      and b.location_id is not distinct from p_location_id
  ),
  keyed as (
    select * from base where key is not null   -- no email AND no phone ⇒ unattributable
  ),
  -- Freshest contact card per customer: name from the most recently created
  -- booking, phone from the most recent booking that actually carried one.
  contact as (
    select distinct on (key) key, customer_email as email, customer_name as name
    from keyed order by key, created_at desc, id
  ),
  contact_phone as (
    select distinct on (key) key, customer_phone as phone
    from keyed
    where nullif(trim(customer_phone), '') is not null
    order by key, created_at desc, id
  ),
  agg as (
    select
      key,
      count(*) filter (where status = 'confirmed')                                  as bookings,
      count(*) filter (where status = 'confirmed' and starts_at >= now())           as upcoming,
      count(*) filter (where status = 'cancelled')                                  as cancelled,
      coalesce(sum(price_cents) filter (where status = 'confirmed'), 0)             as revenue_cents,
      max(starts_at) filter (where status = 'confirmed' and starts_at <  now())     as last_visit,
      min(starts_at) filter (where status = 'confirmed' and starts_at >= now())     as next_visit
    from keyed
    group by key
  )
  select
    a.key,
    c.email,
    c.name,
    cp.phone,
    a.bookings::int,
    a.upcoming::int,
    a.cancelled::int,
    a.revenue_cents::bigint,
    a.last_visit,
    a.next_visit
  from agg a
  join contact c on c.key = a.key
  left join contact_phone cp on cp.key = a.key
  order by a.upcoming desc, a.revenue_cents desc, a.bookings desc, c.name asc;
end;
$$;

revoke all on function public.widget_customers_summary(uuid, text) from public;
grant execute on function public.widget_customers_summary(uuid, text) to authenticated;
