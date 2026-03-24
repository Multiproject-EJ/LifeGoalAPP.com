-- M19C: Cross-device persistence for Island Run creature collection and active companion.

alter table if exists island_run_runtime_state
  add column if not exists creature_collection jsonb not null default '[]'::jsonb;

alter table if exists island_run_runtime_state
  add column if not exists active_companion_id text;

comment on column island_run_runtime_state.creature_collection is
  'Island Run creature collection entries (id, copies, timestamps, bond progress) for cross-device sync.';

comment on column island_run_runtime_state.active_companion_id is
  'Currently selected active companion creature id for Island Run sanctuary bonuses.';
