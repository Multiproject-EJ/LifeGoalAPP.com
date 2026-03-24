-- M19D: Cross-device persistence for Island Run audio/haptics toggle preference.

alter table if exists island_run_runtime_state
  add column if not exists audio_enabled boolean not null default true;

comment on column island_run_runtime_state.audio_enabled is
  'Island Run audio/haptics toggle preference for cross-device synchronization.';
