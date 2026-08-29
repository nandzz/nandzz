-- Fix: widget_customers_summary threw `column reference "id" is ambiguous`.
-- The RETURNS TABLE (id text, …) declares an OUT variable `id`, which collides
-- with widget_bookings.id referenced in the `ORDER BY … , id` tie-breaker of the
-- contact CTEs. PL/pgSQL couldn't tell the OUT variable from the column, so the
-- function raised at RETURN QUERY and callers silently got zero customers.
--
-- Two belt-and-suspenders fixes: the `#variable_conflict use_column` pragma makes
-- any such name resolve to the column, and the tie-breakers are schema-qualified
-- (keyed.id) so intent is explicit. Body is otherwise identical to
-- 20260828120000.

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
#variable_conflict use_column
begin
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
  contact as (
    select distinct on (key) key, customer_email as email, customer_name as name
    from keyed order by key, created_at desc, keyed.id
  ),
  contact_phone as (
    select distinct on (key) key, customer_phone as phone
    from keyed
    where nullif(trim(customer_phone), '') is not null
    order by key, created_at desc, keyed.id
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
