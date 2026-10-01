-- Canonical, owner-scoped expansion-voyage state (dev-only expansion packs).
--
-- Stored on the existing runtime-state row, which already has self-only RLS
-- policies and authenticated grants. Holds owned/completed pack ids, the
-- active voyage and the stashed board position of the voyages not in play.
-- Defaults to the main voyage with no packs, so existing players are
-- unaffected.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS expansion_voyage_state jsonb NOT NULL
  DEFAULT '{"version":1,"activeVoyageId":"main","ownedPackIds":[],"completedPackIds":[],"stashedPathsByVoyage":{},"updatedAtMs":0}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.expansion_voyage_state IS
  'Canonical expansion-voyage state: owned/completed pack ids, active voyage id and stashed path snapshots of inactive voyages. Dev-only feature until production ready.';
