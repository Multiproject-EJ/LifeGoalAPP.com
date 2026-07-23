begin;

-- Production drift repair: current clients already read/write these ledgers,
-- but the historical numeric migrations were never recorded on production.
alter table public.island_run_runtime_state
  add column if not exists tech_collection_by_island jsonb not null default '{}'::jsonb,
  add column if not exists tech_collection_rewarded_lines_by_island jsonb not null default '{}'::jsonb,
  add column if not exists arena_first_ticket_boost_claimed_by_event jsonb not null default '{}'::jsonb,
  add column if not exists fortune_engine_progress_by_event jsonb not null default '{}'::jsonb;

comment on column public.island_run_runtime_state.tech_collection_by_island is
  'Per-island picked-up tech grid. Key = island number string, value = collected 3x3 slot indices.';
comment on column public.island_run_runtime_state.tech_collection_rewarded_lines_by_island is
  'Per-island ledger of tech-grid line indices that have already paid a completion reward.';
comment on column public.island_run_runtime_state.arena_first_ticket_boost_claimed_by_event is
  'Per-event idempotency ledger for the Arena first-ticket boost.';
comment on column public.island_run_runtime_state.fortune_engine_progress_by_event is
  'Canonical Fortune Engine progress ledger keyed by timed-event runtime event id.';

-- Cross-device idempotency for telemetry events that represent one logical
-- product occurrence (for example one offer schedule per offer date).
alter table public.telemetry_events
  add column if not exists dedupe_key text;

create unique index if not exists telemetry_events_user_event_dedupe_key_uidx
  on public.telemetry_events (user_id, event_type, dedupe_key);

comment on column public.telemetry_events.dedupe_key is
  'Optional caller-supplied idempotency key. Non-null keys are unique per user and event type.';

-- The old two-column constraint prevents the intended free + bonus hatch pair
-- for a given day. The three-column constraint remains authoritative.
alter table public.daily_calendar_hatches
  drop constraint if exists daily_calendar_hatches_season_id_day_index_key;

alter table public.daily_calendar_seasons enable row level security;
alter table public.daily_calendar_hatches enable row level security;
alter table public.daily_calendar_progress enable row level security;
alter table public.daily_calendar_rewards enable row level security;

drop policy if exists "Anyone can view daily calendar seasons" on public.daily_calendar_seasons;
drop policy if exists "Users can view their personal calendar seasons" on public.daily_calendar_seasons;
drop policy if exists "Users can insert personal calendar seasons" on public.daily_calendar_seasons;
drop policy if exists "Users can update personal calendar seasons" on public.daily_calendar_seasons;

create policy "Public calendar seasons are readable"
  on public.daily_calendar_seasons for select to anon
  using (user_id_owner is null);

create policy "Users can read visible calendar seasons"
  on public.daily_calendar_seasons for select to authenticated
  using (user_id_owner is null or (select auth.uid()) = user_id_owner);

create policy "Users can insert their own calendar seasons"
  on public.daily_calendar_seasons for insert to authenticated
  with check ((select auth.uid()) = user_id_owner);

create policy "Users can update their own calendar seasons"
  on public.daily_calendar_seasons for update to authenticated
  using ((select auth.uid()) = user_id_owner)
  with check ((select auth.uid()) = user_id_owner);

drop policy if exists "Anyone can view daily calendar hatches" on public.daily_calendar_hatches;
drop policy if exists "Users can insert hatches for their own seasons" on public.daily_calendar_hatches;

create policy "Public calendar hatches are readable"
  on public.daily_calendar_hatches for select to anon
  using (
    exists (
      select 1 from public.daily_calendar_seasons season
      where season.id = season_id and season.user_id_owner is null
    )
  );

create policy "Users can read visible calendar hatches"
  on public.daily_calendar_hatches for select to authenticated
  using (
    exists (
      select 1 from public.daily_calendar_seasons season
      where season.id = season_id
        and (season.user_id_owner is null or season.user_id_owner = (select auth.uid()))
    )
  );

create policy "Users can insert hatches for their own seasons"
  on public.daily_calendar_hatches for insert to authenticated
  with check (
    exists (
      select 1 from public.daily_calendar_seasons season
      where season.id = season_id and season.user_id_owner = (select auth.uid())
    )
  );

drop policy if exists "Users can view their daily calendar progress" on public.daily_calendar_progress;
drop policy if exists "Users can insert their daily calendar progress" on public.daily_calendar_progress;
drop policy if exists "Users can update their daily calendar progress" on public.daily_calendar_progress;

create policy "Users can view their daily calendar progress"
  on public.daily_calendar_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their daily calendar progress"
  on public.daily_calendar_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their daily calendar progress"
  on public.daily_calendar_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their daily calendar rewards" on public.daily_calendar_rewards;
drop policy if exists "Users can insert their daily calendar rewards" on public.daily_calendar_rewards;

create policy "Users can view their daily calendar rewards"
  on public.daily_calendar_rewards for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their daily calendar rewards"
  on public.daily_calendar_rewards for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Grants and RLS are kept together so Data API exposure stays explicit.
revoke all on table public.daily_calendar_seasons from anon, authenticated;
revoke all on table public.daily_calendar_hatches from anon, authenticated;
revoke all on table public.daily_calendar_progress from anon, authenticated;
revoke all on table public.daily_calendar_rewards from anon, authenticated;

grant select on table public.daily_calendar_seasons to anon;
grant select on table public.daily_calendar_hatches to anon;
grant select, insert, update on table public.daily_calendar_seasons to authenticated;
grant select, insert on table public.daily_calendar_hatches to authenticated;
grant select, insert, update on table public.daily_calendar_progress to authenticated;
grant select, insert on table public.daily_calendar_rewards to authenticated;

commit;
