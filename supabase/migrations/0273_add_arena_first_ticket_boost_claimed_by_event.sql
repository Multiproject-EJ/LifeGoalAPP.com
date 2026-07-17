-- Migration ledger version 02730001
alter table public.island_run_runtime_state
  add column if not exists arena_first_ticket_boost_claimed_by_event jsonb not null default '{}'::jsonb;

-- Consolidated companion migration (shared historical version).

-- Migration ledger version 02730002
-- Migration 0273: Add canonical Island Run Fortune Engine progress ledger.
--
-- The Fortune Engine replaces the Lucky Spin placeholder on the `lucky_spin`
-- timed-event rotation slot. Stores per-timed-event campaign state keyed by
-- the runtime event id: reward-track event points, collected Fortune Core
-- fragment ids (3x3 jackpot grid), claimed milestone ids, total launches,
-- best run score, the daily free Golden Launch day key, and the finale
-- trophy flag.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS fortune_engine_progress_by_event jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.fortune_engine_progress_by_event IS
  'Canonical Fortune Engine progress ledger keyed by timed-event runtime event id. Stores eventPoints, fragmentIds, claimedMilestoneIds, totalLaunches, bestRunScore, goldenLaunchDayKey, finaleCompleted, and updatedAtMs for resume.';
