-- M23A: Shift Island Run runtime-state writes away from active-lease dependency.
-- Writes remain scoped to row owner + writer device session id, while continuous
-- active-session lease checks are removed to support version-based action commit flow.

alter table if exists public.island_run_runtime_state
  add column if not exists last_writer_device_session_id text;

comment on column public.island_run_runtime_state.last_writer_device_session_id is
  'Device session id that authored the last runtime-state write; retained for telemetry/conflict UX.';

drop policy if exists "Users can insert their own island run runtime state" on public.island_run_runtime_state;
drop policy if exists "Users can update their own island run runtime state" on public.island_run_runtime_state;

create policy "Users can insert their own island run runtime state"
  on public.island_run_runtime_state
  for insert
  with check (
    auth.uid() = user_id
    and last_writer_device_session_id is not null
    and char_length(trim(last_writer_device_session_id)) > 0
  );

create policy "Users can update their own island run runtime state"
  on public.island_run_runtime_state
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and last_writer_device_session_id is not null
    and char_length(trim(last_writer_device_session_id)) > 0
  );
