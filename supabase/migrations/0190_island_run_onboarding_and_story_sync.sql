-- M19B: Cross-device persistence for onboarding display-name loop completion and prologue story visibility.

alter table if exists island_run_runtime_state
  add column if not exists onboarding_display_name_loop_completed boolean not null default false;

alter table if exists island_run_runtime_state
  add column if not exists story_prologue_seen boolean not null default false;

comment on column island_run_runtime_state.onboarding_display_name_loop_completed is
  'Whether Island Run onboarding display-name loop was completed by this user.';

comment on column island_run_runtime_state.story_prologue_seen is
  'Whether the Island Run prologue story episode has been viewed.';
