-- M23B: Versioned Island Run action commit RPC + idempotency log.

create table if not exists public.island_run_action_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_session_id text,
  client_action_id uuid,
  action_type text not null,
  expected_runtime_version bigint not null,
  applied_runtime_version bigint,
  status text not null,
  payload_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint island_run_action_log_client_action_unique unique (user_id, client_action_id)
);

alter table public.island_run_action_log enable row level security;

drop policy if exists "Users can view their own island run action log" on public.island_run_action_log;
create policy "Users can view their own island run action log"
  on public.island_run_action_log
  for select
  using (auth.uid() = user_id);

revoke all on table public.island_run_action_log from public;
grant select on table public.island_run_action_log to authenticated;
grant select on table public.island_run_action_log to service_role;

create or replace function public.island_run_commit_action(
  p_device_session_id text,
  p_expected_runtime_version bigint,
  p_action_type text,
  p_action_payload jsonb,
  p_client_action_id uuid default null
)
returns table (
  status text,
  runtime_version bigint,
  latest_state jsonb,
  server_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.island_run_runtime_state%rowtype;
  v_next public.island_run_runtime_state%rowtype;
  v_now timestamptz := now();
  v_expected bigint := greatest(0, coalesce(p_expected_runtime_version, 0));
  v_existing_log public.island_run_action_log%rowtype;
  v_response jsonb;
begin
  if v_user_id is null and auth.role() <> 'service_role' then
    raise exception 'Not authenticated';
  end if;

  if p_device_session_id is null or char_length(trim(p_device_session_id)) = 0 then
    return query select 'invalid'::text, 0::bigint, null::jsonb, 'device_session_id is required'::text;
    return;
  end if;

  if coalesce(nullif(trim(p_action_type), ''), 'runtime_snapshot_upsert') <> 'runtime_snapshot_upsert' then
    return query select 'invalid'::text, 0::bigint, null::jsonb, 'Unsupported action_type'::text;
    return;
  end if;

  if p_client_action_id is not null then
    select *
      into v_existing_log
      from public.island_run_action_log
     where user_id = v_user_id
       and client_action_id = p_client_action_id
     limit 1;

    if found then
      return query
      select
        coalesce(v_existing_log.status, 'duplicate')::text,
        coalesce(v_existing_log.applied_runtime_version, 0)::bigint,
        coalesce(v_existing_log.response_json -> 'latest_state', null)::jsonb,
        'Duplicate action id; returning cached response.'::text;
      return;
    end if;
  end if;

  select *
    into v_existing
    from public.island_run_runtime_state
   where user_id = v_user_id
   for update;

  if not found then
    if v_expected <> 0 then
      return query select 'conflict'::text, 0::bigint, null::jsonb, 'Runtime row missing for expected version.'::text;
      return;
    end if;

    v_next := jsonb_populate_record(null::public.island_run_runtime_state, coalesce(p_action_payload, '{}'::jsonb));
  else
    if coalesce(v_existing.runtime_version, 0) <> v_expected then
      return query
      select
        'conflict'::text,
        coalesce(v_existing.runtime_version, 0)::bigint,
        to_jsonb(v_existing),
        'Runtime version mismatch.'::text;
      return;
    end if;

    v_next := jsonb_populate_record(v_existing, coalesce(p_action_payload, '{}'::jsonb));
    delete from public.island_run_runtime_state where user_id = v_user_id;
  end if;

  v_next.user_id := v_user_id;
  v_next.runtime_version := v_expected + 1;
  v_next.last_writer_device_session_id := trim(p_device_session_id);
  v_next.updated_at := v_now;

  insert into public.island_run_runtime_state
  select (v_next).*;

  v_response := jsonb_build_object(
    'status', 'applied',
    'runtime_version', v_next.runtime_version,
    'latest_state', to_jsonb(v_next),
    'server_message', 'Action applied.'
  );

  insert into public.island_run_action_log (
    user_id,
    device_session_id,
    client_action_id,
    action_type,
    expected_runtime_version,
    applied_runtime_version,
    status,
    payload_json,
    response_json
  ) values (
    v_user_id,
    trim(p_device_session_id),
    p_client_action_id,
    'runtime_snapshot_upsert',
    v_expected,
    v_next.runtime_version,
    'applied',
    coalesce(p_action_payload, '{}'::jsonb),
    v_response
  );

  return query
  select
    'applied'::text,
    v_next.runtime_version::bigint,
    to_jsonb(v_next),
    'Action applied.'::text;
end;
$$;

revoke all on function public.island_run_commit_action(text, bigint, text, jsonb, uuid) from public;
grant execute on function public.island_run_commit_action(text, bigint, text, jsonb, uuid) to authenticated;
grant execute on function public.island_run_commit_action(text, bigint, text, jsonb, uuid) to service_role;

comment on function public.island_run_commit_action(text, bigint, text, jsonb, uuid) is
  'Island Run server-authoritative action commit entrypoint with optimistic version checks and idempotency key support.';
