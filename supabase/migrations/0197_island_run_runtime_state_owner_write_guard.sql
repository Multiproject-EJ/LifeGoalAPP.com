-- M22B: Harden runtime-state writes so only active Island Run lease owner can mutate rows.

alter table if exists public.island_run_runtime_state
  add column if not exists last_writer_device_session_id text;

comment on column public.island_run_runtime_state.last_writer_device_session_id is
  'Device session id that authored the last runtime-state write; used for active-lease ownership checks.';

-- Replace broad insert/update policies with lease-aware guards.
drop policy if exists "Users can insert their own island run runtime state" on public.island_run_runtime_state;
drop policy if exists "Users can update their own island run runtime state" on public.island_run_runtime_state;

create policy "Users can insert their own island run runtime state"
  on public.island_run_runtime_state
  for insert
  with check (
    auth.uid() = user_id
    and last_writer_device_session_id is not null
    and char_length(trim(last_writer_device_session_id)) > 0
    and exists (
      select 1
      from public.island_run_active_sessions active_session
      where active_session.user_id = island_run_runtime_state.user_id
        and active_session.device_session_id = island_run_runtime_state.last_writer_device_session_id
        and active_session.expires_at > now()
    )
  );

create policy "Users can update their own island run runtime state"
  on public.island_run_runtime_state
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and last_writer_device_session_id is not null
    and char_length(trim(last_writer_device_session_id)) > 0
    and exists (
      select 1
      from public.island_run_active_sessions active_session
      where active_session.user_id = island_run_runtime_state.user_id
        and active_session.device_session_id = island_run_runtime_state.last_writer_device_session_id
        and active_session.expires_at > now()
    )
  );
