-- ========================================================
-- Migration 0274: Broadcast island_run_runtime_state changes over realtime.
-- Clients subscribe to their own row (RLS-scoped) so a device converges as
-- soon as another device commits a newer runtime snapshot, instead of
-- waiting for the next focus/visibility event.
-- ========================================================

do $$
begin
  -- Add the table to the realtime publication when it is not already
  -- published (idempotent so re-running the migration set is safe, and a
  -- no-op on projects where the publication is FOR ALL TABLES).
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime' and puballtables = false
  ) and not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'island_run_runtime_state'
  ) then
    alter publication supabase_realtime add table public.island_run_runtime_state;
  end if;
end;
$$;

-- postgres_changes UPDATE payloads need the full new row; the default
-- replica identity only ships the primary key on updates from some paths.
alter table public.island_run_runtime_state replica identity full;
