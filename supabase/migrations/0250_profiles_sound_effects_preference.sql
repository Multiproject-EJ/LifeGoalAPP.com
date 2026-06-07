alter table if exists public.profiles
  add column if not exists sound_effects_enabled boolean not null default true;

comment on column public.profiles.sound_effects_enabled is
  'Global app sound effects preference for cross-device synchronization.';
