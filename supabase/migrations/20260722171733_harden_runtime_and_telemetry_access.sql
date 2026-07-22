begin;

-- These tables contain user-specific gameplay state and analytics. Keep the
-- Data API surface authenticated-only and grant only operations used by the
-- clients. Service-role access is unaffected.
revoke all on table public.island_run_runtime_state from anon, authenticated;
revoke all on table public.telemetry_events from anon, authenticated;

grant select, insert, update on table public.island_run_runtime_state to authenticated;
grant select, insert on table public.telemetry_events to authenticated;

drop policy if exists "Users can view their own island run runtime state"
  on public.island_run_runtime_state;
drop policy if exists "Users can insert their own island run runtime state"
  on public.island_run_runtime_state;
drop policy if exists "Users can update their own island run runtime state"
  on public.island_run_runtime_state;

create policy "Users can view their own island run runtime state"
  on public.island_run_runtime_state for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own island run runtime state"
  on public.island_run_runtime_state for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and last_writer_device_session_id is not null
    and char_length(trim(last_writer_device_session_id)) > 0
  );

create policy "Users can update their own island run runtime state"
  on public.island_run_runtime_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and last_writer_device_session_id is not null
    and char_length(trim(last_writer_device_session_id)) > 0
  );

drop policy if exists "Users can view their own telemetry events"
  on public.telemetry_events;
drop policy if exists "Users can insert their own telemetry events"
  on public.telemetry_events;
drop policy if exists telemetry_events_admin_select_all
  on public.telemetry_events;

-- One SELECT policy avoids evaluating two permissive policies for every row.
create policy "Users can view permitted telemetry events"
  on public.telemetry_events for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.admin_users admin_row
      where admin_row.user_id = (select auth.uid())
        and admin_row.active = true
    )
  );

create policy "Users can insert their own telemetry events"
  on public.telemetry_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

commit;
