-- Public campaign sharing must cross the owner-only RLS boundary for
-- unlisted, secret-slug links. Keep the existing full-row readers restricted
-- to service_role and expose separate SECURITY DEFINER functions with a
-- deliberately small, typed projection.

create or replace function public.get_public_shared_campaign(p_share_slug text)
returns table (
  title text,
  description text,
  campaign_type text,
  status text,
  visibility text,
  starts_on date,
  ends_on date,
  life_wheel_category text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.title,
    c.description,
    c.campaign_type,
    c.status,
    c.visibility,
    c.starts_on,
    c.ends_on,
    c.life_wheel_category,
    c.published_at
  from public.campaigns as c
  where c.share_slug = p_share_slug
    and p_share_slug is not null
    and btrim(p_share_slug) <> ''
    and c.visibility in ('unlisted', 'public')
    and c.status in ('active', 'completed');
$$;

revoke execute on function public.get_public_shared_campaign(text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_shared_campaign(text)
  to anon, authenticated, service_role;

comment on function public.get_public_shared_campaign(text) is
  'Returns only explicitly share-safe campaign fields for an active or completed public/unlisted secret-slug link. Intentionally SECURITY DEFINER to cross owner RLS; excludes IDs, ownership, goal links, profile snapshots, campaign_data, and live_state.';

create or replace function public.get_public_shared_campaign_live_events(
  p_share_slug text,
  p_limit integer default 50
)
returns table (
  event_type text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when e.event_type ~ '^[a-z0-9_]{1,64}$' then e.event_type
      else 'activity'
    end as event_type,
    e.created_at
  from public.campaign_live_events as e
  join public.campaigns as c on c.id = e.campaign_id
  where c.share_slug = p_share_slug
    and p_share_slug is not null
    and btrim(p_share_slug) <> ''
    and c.visibility in ('unlisted', 'public')
    and c.status = 'active'
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke execute on function public.get_public_shared_campaign_live_events(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_shared_campaign_live_events(text, integer)
  to anon, authenticated, service_role;

comment on function public.get_public_shared_campaign_live_events(text, integer) is
  'Returns a bounded public activity feed for an active public/unlisted secret-slug campaign. Intentionally SECURITY DEFINER to cross RLS; excludes all IDs, user references, and event_data, and normalizes non-machine event types.';
