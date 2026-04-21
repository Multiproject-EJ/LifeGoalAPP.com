-- Migration 0231: Add minigame_tickets_by_event column to
-- island_run_runtime_state so per-event minigame ticket balances persist
-- across devices.
--
-- Phase 1 of the Minigame & Events Consolidation Plan
-- (docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md §7).
--
-- Shape (client-side `IslandRunGameStateRecord.minigameTicketsByEvent`):
--   {
--     "<eventId>": <ticket count>,
--     ...
--   }
-- eventId matches the canonical timed-event union:
--   feeding_frenzy | lucky_spin | space_excavator | companion_feast
-- Value: non-negative integer count of unused tickets for that event.
--
-- Zero balances are pruned on write. Column is additive only — nothing reads
-- from it yet (that lands in Phase 6/7 when Stripe top-ups + event-gated
-- launches ship); Phase 1 just reserves the column so later client writes
-- have somewhere to land.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS minigame_tickets_by_event jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.minigame_tickets_by_event IS
  'Per-timed-event minigame ticket ledger. Outer key: eventId (feeding_frenzy | lucky_spin | space_excavator | companion_feast). Value: non-negative integer count. Zero entries are pruned on write. See docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md §7 and src/config/islandRunFeatureFlags.ts.';
