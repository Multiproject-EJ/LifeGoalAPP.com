-- Persist split Island Run audio preferences per player profile/runtime row.
-- `audio_enabled` remains the legacy aggregate for backward compatibility;
-- `music_enabled` and `sfx_enabled` preserve independent user choices.

alter table if exists island_run_runtime_state
  add column if not exists music_enabled boolean,
  add column if not exists sfx_enabled boolean;

update island_run_runtime_state
set
  music_enabled = coalesce(music_enabled, audio_enabled, true),
  sfx_enabled = coalesce(sfx_enabled, audio_enabled, true)
where music_enabled is null or sfx_enabled is null;

alter table if exists island_run_runtime_state
  alter column music_enabled set default true,
  alter column music_enabled set not null,
  alter column sfx_enabled set default true,
  alter column sfx_enabled set not null;

comment on column island_run_runtime_state.music_enabled is
  'Island Run music preference for cross-device synchronization.';

comment on column island_run_runtime_state.sfx_enabled is
  'Island Run sound effects preference for cross-device synchronization.';
