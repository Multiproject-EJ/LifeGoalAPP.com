-- M22A: Island Run single-active-device lease table and RPC foundation.
-- Enforces one active gameplay owner per user via device session lease + heartbeat TTL.

create table if not exists public.island_run_active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_session_id text not null,
  lease_version bigint not null default 0,
  takeover_reason text,
  metadata jsonb not null default '{}'::jsonb,
  claimed_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint island_run_active_sessions_device_session_id_not_blank check (char_length(trim(device_session_id)) > 0)
);

alter table public.island_run_active_sessions
  add column if not exists device_session_id text,
  add column if not exists lease_version bigint not null default 0,
  add column if not exists takeover_reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists claimed_at timestamptz not null default now(),
  add column if not exists heartbeat_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.island_run_active_sessions
set expires_at = coalesce(expires_at, now() + interval '35 seconds')
where expires_at is null;

alter table public.island_run_active_sessions
  alter column device_session_id set not null,
  alter column expires_at set not null;

create index if not exists idx_island_run_active_sessions_expires_at
  on public.island_run_active_sessions(expires_at);

alter table public.island_run_active_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'island_run_active_sessions'
      and policyname = 'Users can view their own island run active session'
  ) then
    create policy "Users can view their own island run active session"
      on public.island_run_active_sessions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'island_run_active_sessions'
      and policyname = 'Users can insert their own island run active session'
  ) then
    create policy "Users can insert their own island run active session"
      on public.island_run_active_sessions
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'island_run_active_sessions'
      and policyname = 'Users can update their own island run active session'
  ) then
    create policy "Users can update their own island run active session"
      on public.island_run_active_sessions
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'island_run_active_sessions'
      and policyname = 'Users can delete their own island run active session'
  ) then
    create policy "Users can delete their own island run active session"
      on public.island_run_active_sessions
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.island_run_claim_active_session(
  p_device_session_id text,
  p_force_takeover boolean default true,
  p_takeover_reason text default 'enter',
  p_metadata jsonb default '{}'::jsonb,
  p_lease_ttl_seconds integer default 35
)
returns table (
  ownership_status text,
  lease_version bigint,
  expires_at timestamptz,
  previous_device_session_id text,
  active_device_session_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_ttl interval;
  v_row public.island_run_active_sessions%rowtype;
  v_lease_version bigint;
begin
  if v_user_id is null and auth.role() <> 'service_role' then
    raise exception 'Not authenticated';
  end if;

  if p_device_session_id is null or char_length(trim(p_device_session_id)) = 0 then
    raise exception 'p_device_session_id is required';
  end if;

  if p_lease_ttl_seconds is null or p_lease_ttl_seconds < 10 then
    p_lease_ttl_seconds := 10;
  end if;

  if auth.role() = 'service_role' and v_user_id is null then
    raise exception 'service_role calls must include auth context user id';
  end if;

  v_ttl := make_interval(secs => p_lease_ttl_seconds);

  select *
  into v_row
  from public.island_run_active_sessions
  where user_id = v_user_id
  for update;

  if not found then
    insert into public.island_run_active_sessions (
      user_id,
      device_session_id,
      lease_version,
      takeover_reason,
      metadata,
      claimed_at,
      heartbeat_at,
      expires_at,
      updated_at
    ) values (
      v_user_id,
      trim(p_device_session_id),
      1,
      coalesce(nullif(trim(p_takeover_reason), ''), 'enter'),
      coalesce(p_metadata, '{}'::jsonb),
      v_now,
      v_now,
      v_now + v_ttl,
      v_now
    );

    return query
    select
      'granted'::text,
      1::bigint,
      v_now + v_ttl,
      null::text,
      trim(p_device_session_id);
    return;
  end if;

  if v_row.device_session_id = trim(p_device_session_id) then
    update public.island_run_active_sessions
    set
      heartbeat_at = v_now,
      expires_at = v_now + v_ttl,
      metadata = coalesce(p_metadata, metadata),
      updated_at = v_now
    where user_id = v_user_id;

    return query
    select
      'already_owner'::text,
      v_row.lease_version,
      v_now + v_ttl,
      v_row.device_session_id,
      v_row.device_session_id;
    return;
  end if;

  if v_row.expires_at > v_now and not coalesce(p_force_takeover, true) then
    return query
    select
      'conflict'::text,
      v_row.lease_version,
      v_row.expires_at,
      v_row.device_session_id,
      v_row.device_session_id;
    return;
  end if;

  v_lease_version := greatest(1, v_row.lease_version + 1);

  update public.island_run_active_sessions
  set
    device_session_id = trim(p_device_session_id),
    lease_version = v_lease_version,
    takeover_reason = coalesce(nullif(trim(p_takeover_reason), ''), case when v_row.expires_at > v_now then 'takeover' else 'reclaim_expired' end),
    metadata = coalesce(p_metadata, '{}'::jsonb),
    claimed_at = v_now,
    heartbeat_at = v_now,
    expires_at = v_now + v_ttl,
    updated_at = v_now
  where user_id = v_user_id;

  return query
  select
    'granted'::text,
    v_lease_version,
    v_now + v_ttl,
    v_row.device_session_id,
    trim(p_device_session_id);
end;
$$;

create or replace function public.island_run_heartbeat_session(
  p_device_session_id text,
  p_lease_ttl_seconds integer default 35
)
returns table (
  heartbeat_status text,
  lease_version bigint,
  expires_at timestamptz,
  active_device_session_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_ttl interval;
  v_row public.island_run_active_sessions%rowtype;
begin
  if v_user_id is null and auth.role() <> 'service_role' then
    raise exception 'Not authenticated';
  end if;

  if p_device_session_id is null or char_length(trim(p_device_session_id)) = 0 then
    raise exception 'p_device_session_id is required';
  end if;

  if p_lease_ttl_seconds is null or p_lease_ttl_seconds < 10 then
    p_lease_ttl_seconds := 10;
  end if;

  v_ttl := make_interval(secs => p_lease_ttl_seconds);

  select *
  into v_row
  from public.island_run_active_sessions
  where user_id = v_user_id
  for update;

  if not found then
    return query select 'missing'::text, 0::bigint, null::timestamptz, null::text;
    return;
  end if;

  if v_row.device_session_id <> trim(p_device_session_id) then
    return query
    select
      'not_owner'::text,
      v_row.lease_version,
      v_row.expires_at,
      v_row.device_session_id;
    return;
  end if;

  update public.island_run_active_sessions
  set
    heartbeat_at = v_now,
    expires_at = v_now + v_ttl,
    updated_at = v_now
  where user_id = v_user_id;

  return query
  select
    'ok'::text,
    v_row.lease_version,
    v_now + v_ttl,
    v_row.device_session_id;
end;
$$;

create or replace function public.island_run_release_active_session(
  p_device_session_id text
)
returns table (
  released boolean,
  lease_version bigint,
  active_device_session_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.island_run_active_sessions%rowtype;
begin
  if v_user_id is null and auth.role() <> 'service_role' then
    raise exception 'Not authenticated';
  end if;

  if p_device_session_id is null or char_length(trim(p_device_session_id)) = 0 then
    raise exception 'p_device_session_id is required';
  end if;

  select *
  into v_row
  from public.island_run_active_sessions
  where user_id = v_user_id
  for update;

  if not found then
    return query select true, 0::bigint, null::text;
    return;
  end if;

  if v_row.device_session_id <> trim(p_device_session_id) then
    return query
    select false, v_row.lease_version, v_row.device_session_id;
    return;
  end if;

  delete from public.island_run_active_sessions
  where user_id = v_user_id;

  return query select true, v_row.lease_version, null::text;
end;
$$;

create or replace function public.island_run_validate_session_owner(
  p_device_session_id text
)
returns table (
  is_owner boolean,
  lease_is_active boolean,
  lease_version bigint,
  expires_at timestamptz,
  active_device_session_id text
)
language sql
security definer
set search_path = public
as $$
  with current_row as (
    select *
    from public.island_run_active_sessions
    where user_id = auth.uid()
  )
  select
    case when count(*) = 0 then false
      else bool_or(device_session_id = trim(p_device_session_id))
    end as is_owner,
    case when count(*) = 0 then false
      else bool_or(expires_at > now())
    end as lease_is_active,
    coalesce(max(lease_version), 0) as lease_version,
    max(expires_at) as expires_at,
    max(device_session_id) as active_device_session_id
  from current_row;
$$;

revoke all on function public.island_run_claim_active_session(text, boolean, text, jsonb, integer) from public;
revoke all on function public.island_run_heartbeat_session(text, integer) from public;
revoke all on function public.island_run_release_active_session(text) from public;
revoke all on function public.island_run_validate_session_owner(text) from public;

grant execute on function public.island_run_claim_active_session(text, boolean, text, jsonb, integer) to authenticated;
grant execute on function public.island_run_claim_active_session(text, boolean, text, jsonb, integer) to service_role;
grant execute on function public.island_run_heartbeat_session(text, integer) to authenticated;
grant execute on function public.island_run_heartbeat_session(text, integer) to service_role;
grant execute on function public.island_run_release_active_session(text) to authenticated;
grant execute on function public.island_run_release_active_session(text) to service_role;
grant execute on function public.island_run_validate_session_owner(text) to authenticated;
grant execute on function public.island_run_validate_session_owner(text) to service_role;

comment on table public.island_run_active_sessions is
  'Single-owner lease for Island Run gameplay. Last claiming device session becomes active owner until lease expiry or release.';

comment on function public.island_run_claim_active_session(text, boolean, text, jsonb, integer) is
  'Claims/refreshes Island Run active session ownership for the current user using device session lease semantics.';

comment on function public.island_run_heartbeat_session(text, integer) is
  'Renews active Island Run session lease heartbeat if caller is the current owner.';

comment on function public.island_run_release_active_session(text) is
  'Best-effort release of active Island Run session ownership for the current device.';

comment on function public.island_run_validate_session_owner(text) is
  'Returns ownership and lease activity status for the supplied Island Run device session id.';
