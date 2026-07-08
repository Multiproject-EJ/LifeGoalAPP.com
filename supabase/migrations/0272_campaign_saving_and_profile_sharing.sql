-- ========================================================
-- CAMPAIGN SAVING + PROFILE SHARING
-- Migration 0272: Persist user-authored campaign drafts, live campaign
-- state, participant progress, and shareable profile-backed campaign links.
-- ========================================================

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  campaign_type text not null default 'custom',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  starts_on date,
  ends_on date,
  campaign_data jsonb not null default '{}'::jsonb,
  live_state jsonb not null default '{}'::jsonb,
  share_slug text unique,
  profile_share_enabled boolean not null default false,
  profile_snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_share_slug_publication_check
    check (share_slug is null or visibility in ('unlisted', 'public')),
  constraint campaigns_date_range_check
    check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member', 'viewer')),
  participant_profile jsonb not null default '{}'::jsonb,
  progress_data jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create table if not exists public.campaign_live_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_owner_status_updated_idx
  on public.campaigns (owner_id, status, updated_at desc);
create index if not exists campaigns_visibility_status_idx
  on public.campaigns (visibility, status, updated_at desc)
  where visibility in ('unlisted', 'public');
create index if not exists campaigns_share_slug_idx
  on public.campaigns (share_slug)
  where share_slug is not null;
create index if not exists campaign_participants_user_idx
  on public.campaign_participants (user_id, updated_at desc);
create index if not exists campaign_participants_campaign_idx
  on public.campaign_participants (campaign_id, role);
create index if not exists campaign_live_events_campaign_created_idx
  on public.campaign_live_events (campaign_id, created_at desc);
create index if not exists campaign_live_events_type_created_idx
  on public.campaign_live_events (event_type, created_at desc);

alter table public.campaigns enable row level security;
alter table public.campaign_participants enable row level security;
alter table public.campaign_live_events enable row level security;

create or replace function public.set_campaigns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
before update on public.campaigns
for each row execute procedure public.set_campaigns_updated_at();

drop trigger if exists trg_campaign_participants_updated_at on public.campaign_participants;
create trigger trg_campaign_participants_updated_at
before update on public.campaign_participants
for each row execute procedure public.set_campaigns_updated_at();

create policy "campaigns_owner_select"
  on public.campaigns for select
  using (auth.uid() = owner_id);

create policy "campaigns_public_share_select"
  on public.campaigns for select
  using (
    visibility = 'public'
    and share_slug is not null
    and status in ('active', 'completed')
  );

create policy "campaigns_insert_own"
  on public.campaigns for insert
  with check (auth.uid() = owner_id);

create policy "campaigns_update_own"
  on public.campaigns for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "campaigns_delete_own"
  on public.campaigns for delete
  using (auth.uid() = owner_id);

create policy "campaign_participants_select_related"
  on public.campaign_participants for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.owner_id = auth.uid()
    )
  );

create policy "campaign_participants_insert_self_or_owner"
  on public.campaign_participants for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.owner_id = auth.uid()
    )
  );

create policy "campaign_participants_update_self_or_owner"
  on public.campaign_participants for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.owner_id = auth.uid()
    )
  );

create policy "campaign_participants_delete_self_or_owner"
  on public.campaign_participants for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.owner_id = auth.uid()
    )
  );

create policy "campaign_live_events_select_related_or_shared"
  on public.campaign_live_events for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (
          c.owner_id = auth.uid()
          or (c.visibility = 'public' and c.share_slug is not null and c.status = 'active')
        )
    )
    or exists (
      select 1 from public.campaign_participants p
      where p.campaign_id = campaign_live_events.campaign_id
        and p.user_id = auth.uid()
    )
  );

create policy "campaign_live_events_insert_related"
  on public.campaign_live_events for insert
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.campaigns c
        where c.id = campaign_id
          and c.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.campaign_participants p
        where p.campaign_id = campaign_live_events.campaign_id
          and p.user_id = auth.uid()
      )
    )
  );


create or replace function public.get_shared_campaign(p_share_slug text)
returns setof public.campaigns
language sql
stable
security definer
set search_path = public
as $$
  select c.*
  from public.campaigns c
  where c.share_slug = p_share_slug
    and c.visibility in ('unlisted', 'public')
    and c.status in ('active', 'completed');
$$;

grant execute on function public.get_shared_campaign(text) to anon, authenticated;

create or replace function public.get_shared_campaign_live_events(p_share_slug text, p_limit integer default 50)
returns setof public.campaign_live_events
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.campaign_live_events e
  join public.campaigns c on c.id = e.campaign_id
  where c.share_slug = p_share_slug
    and c.visibility in ('unlisted', 'public')
    and c.status = 'active'
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.get_shared_campaign_live_events(text, integer) to anon, authenticated;

comment on table public.campaigns is
  'Supabase-backed saved campaign drafts and live campaigns. campaign_data stores editable plan/config, live_state stores resumable active state, and share_slug/profile_snapshot support profile sharing.';
comment on table public.campaign_participants is
  'Per-user campaign membership, shared profile display data, and participant progress for live campaigns.';
comment on table public.campaign_live_events is
  'Append-only live campaign activity stream for profile sharing, replays, and cross-device sync.';
