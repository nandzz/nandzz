-- Content Studio redesign: explicit content_type column.
--
-- Today a space's "type" is inferred from which of six mutually-exclusive
-- nullable columns is populated (html_url, url, pdf_url, image_url,
-- video_url, markdown_content). That inference can't distinguish manually
-- created HTML pages from AI-generated ones (both only ever populate
-- html_url), and the app layer is moving to explicit per-type builders.
-- This adds a first-class content_type column, backfills it for existing
-- rows using the same inference the app already relies on, and updates
-- publish_space_tx (the single insert path used by both the web app and
-- the MCP edge-function tools) to populate it going forward.
--
-- content_type stays nullable here on purpose: nothing today enforces
-- "exactly one populated column" at the DB level, so a NOT NULL constraint
-- could fail on unexpected legacy rows. Add NOT NULL in a follow-up
-- migration only after confirming zero NULLs in prod.

alter table public.spaces add column if not exists content_type text;

create index if not exists spaces_content_type_idx on public.spaces (content_type);

-- Backfill existing rows. Order is arbitrary among these branches since the
-- app has always kept the six type columns mutually exclusive per row.
update public.spaces set content_type = 'notes' where content_type is null and markdown_content is not null;
update public.spaces set content_type = 'video' where content_type is null and video_url is not null;
update public.spaces set content_type = 'image' where content_type is null and image_url is not null;
update public.spaces set content_type = 'pdf'   where content_type is null and pdf_url is not null;
update public.spaces set content_type = 'html'  where content_type is null and html_url is not null;
update public.spaces set content_type = 'link'  where content_type is null and url is not null;

-- Re-declare publish_space_tx (unchanged signature/grants) to also persist
-- content_type. New web-app builders will always pass an explicit
-- content_type in p_space_payload; MCP tool payloads never send one and
-- only ever populate a single unambiguous column, so the same inference
-- used for the backfill above is the correct fallback for them.
create or replace function public.publish_space_tx(
  p_user_id           uuid,
  p_space_payload     jsonb,
  p_client_request_id uuid,
  p_cost              int default null
)
returns table (
  space_id           uuid,
  free_space_credits int,
  paid_credits       int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile         public.profiles%rowtype;
  v_cost            int;
  v_use_free        int;
  v_use_paid        int;
  v_new_free        int;
  v_new_paid        int;
  v_existing_space  uuid;
  v_new_space_id    uuid;
  v_content_type    text;
begin
  if p_user_id is null then
    raise exception 'user_id required' using errcode = 'P0001';
  end if;

  if p_cost is null then
    select coalesce((value->>'amount')::int, 10)
      into v_cost
    from public.app_settings
    where key = 'publish_space_cost';
    v_cost := coalesce(v_cost, 10);
  else
    v_cost := p_cost;
  end if;

  if v_cost < 0 then
    raise exception 'cost must be non-negative' using errcode = 'P0001';
  end if;

  -- Idempotent retry: if a row already exists for this client_request_id, return it.
  if p_client_request_id is not null then
    select id into v_existing_space
    from public.spaces
    where user_id = p_user_id and client_request_id = p_client_request_id;

    if v_existing_space is not null then
      select p.free_space_credits, p.paid_credits
        into v_new_free, v_new_paid
      from public.profiles p where p.id = p_user_id;
      return query select v_existing_space, v_new_free, v_new_paid;
      return;
    end if;
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0001';
  end if;

  v_use_free := least(v_profile.free_space_credits, v_cost);
  v_use_paid := v_cost - v_use_free;

  if v_use_paid > v_profile.paid_credits then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  v_new_free := v_profile.free_space_credits - v_use_free;
  v_new_paid := v_profile.paid_credits - v_use_paid;

  update public.profiles
  set free_space_credits = v_new_free,
      paid_credits       = v_new_paid
  where id = p_user_id;

  v_content_type := coalesce(
    p_space_payload->>'content_type',
    case
      when p_space_payload->>'markdown_content' is not null then 'notes'
      when p_space_payload->>'video_url' is not null then 'video'
      when p_space_payload->>'image_url' is not null then 'image'
      when p_space_payload->>'pdf_url' is not null then 'pdf'
      when p_space_payload->>'html_url' is not null then 'html'
      when p_space_payload->>'url' is not null then 'link'
    end
  );

  insert into public.spaces (
    user_id, title, description, url, html_url, pdf_url, image_url, video_url,
    markdown_content, preview_image_url, preview_gradient, preview_title,
    is_public, hashtags, client_request_id, content_type
  )
  values (
    p_user_id,
    p_space_payload->>'title',
    p_space_payload->>'description',
    p_space_payload->>'url',
    p_space_payload->>'html_url',
    p_space_payload->>'pdf_url',
    p_space_payload->>'image_url',
    p_space_payload->>'video_url',
    p_space_payload->>'markdown_content',
    p_space_payload->>'preview_image_url',
    coalesce(p_space_payload->>'preview_gradient', 'violet'),
    p_space_payload->>'preview_title',
    coalesce((p_space_payload->>'is_public')::boolean, true),
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(p_space_payload->'hashtags')),
      '{}'::text[]
    ),
    p_client_request_id,
    v_content_type
  )
  returning id into v_new_space_id;

  if v_use_free > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, -v_use_free, 'free_space', 'publish_space',
      v_new_free, v_new_paid,
      'space', v_new_space_id::text, jsonb_build_object('cost', v_cost)
    );
  end if;
  if v_use_paid > 0 then
    insert into public.credit_ledger (
      user_id, delta, bucket, reason,
      balance_after_free, balance_after_paid,
      related_entity_type, related_entity_id, metadata
    ) values (
      p_user_id, -v_use_paid, 'paid', 'publish_space',
      v_new_free, v_new_paid,
      'space', v_new_space_id::text, jsonb_build_object('cost', v_cost)
    );
  end if;

  return query select v_new_space_id, v_new_free, v_new_paid;
end;
$$;

revoke all on function public.publish_space_tx(uuid, jsonb, uuid, int) from public;
grant execute on function public.publish_space_tx(uuid, jsonb, uuid, int) to authenticated, service_role;
