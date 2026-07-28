-- Adventure League is explicitly opt-in: a player is publicly ranked only
-- while their row exists. The table contains no private profile columns.
create table if not exists public.adventure_league_entries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  archetype text not null check (char_length(archetype) between 1 and 40),
  combined_journey_level integer not null default 1 check (combined_journey_level >= 1),
  combined_journey_xp integer not null default 0 check (combined_journey_xp >= 0),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_adventure_league_rank
  on public.adventure_league_entries (
    combined_journey_xp desc,
    combined_journey_level desc,
    user_id asc
  );

alter table public.adventure_league_entries enable row level security;

drop policy if exists adventure_league_authenticated_read on public.adventure_league_entries;
create policy adventure_league_authenticated_read
  on public.adventure_league_entries
  for select
  to authenticated
  using (true);

drop policy if exists adventure_league_owner_insert on public.adventure_league_entries;
create policy adventure_league_owner_insert
  on public.adventure_league_entries
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists adventure_league_owner_update on public.adventure_league_entries;
create policy adventure_league_owner_update
  on public.adventure_league_entries
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists adventure_league_owner_delete on public.adventure_league_entries;
create policy adventure_league_owner_delete
  on public.adventure_league_entries
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.adventure_league_entries from anon;
revoke all on table public.adventure_league_entries from authenticated;
grant select, insert, update, delete on table public.adventure_league_entries to authenticated;

-- Arena preferences are private and cross-device. Exactly one of four games
-- may be disabled (25%); the app also normalizes values defensively.
create table if not exists public.arena_minigame_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ranked_event_ids jsonb not null default '["feeding_frenzy","lucky_spin","space_excavator","companion_feast"]'::jsonb,
  disabled_event_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint arena_ranked_event_ids_array check (jsonb_typeof(ranked_event_ids) = 'array'),
  constraint arena_disabled_event_ids_array check (jsonb_typeof(disabled_event_ids) = 'array'),
  constraint arena_disabled_event_ids_limit check (jsonb_array_length(disabled_event_ids) <= 1)
);

alter table public.arena_minigame_preferences enable row level security;

drop policy if exists arena_preferences_owner_select on public.arena_minigame_preferences;
create policy arena_preferences_owner_select
  on public.arena_minigame_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists arena_preferences_owner_insert on public.arena_minigame_preferences;
create policy arena_preferences_owner_insert
  on public.arena_minigame_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists arena_preferences_owner_update on public.arena_minigame_preferences;
create policy arena_preferences_owner_update
  on public.arena_minigame_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists arena_preferences_owner_delete on public.arena_minigame_preferences;
create policy arena_preferences_owner_delete
  on public.arena_minigame_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.arena_minigame_preferences from anon;
revoke all on table public.arena_minigame_preferences from authenticated;
grant select, insert, update, delete on table public.arena_minigame_preferences to authenticated;
