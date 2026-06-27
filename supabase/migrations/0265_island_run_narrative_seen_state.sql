-- 0265_island_run_narrative_seen_state.sql
-- Cross-device narrative beat/episode "seen" ledger for Island Run.
--
-- This is non-gameplay presentation state: it records which one-time narrative
-- beats and story episodes a player has already been shown so they are not
-- replayed. localStorage remains the offline-immediate mirror; this column is
-- the canonical, device-syncing copy that the runtime state record reads and
-- writes through the existing single-writer persistence path.
--
-- Shape: { "beats": { "<beatId>": <epoch_ms> }, "episodes": { "<episodeId>": <epoch_ms> } }

alter table public.island_run_runtime_state
  add column if not exists narrative_seen_state jsonb not null default '{}'::jsonb;

comment on column public.island_run_runtime_state.narrative_seen_state is
  'Cross-device narrative seen-ledger: { beats: {beatId: epochMs}, episodes: {episodeId: epochMs} }. Non-gameplay presentation state.';
