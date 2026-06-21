-- Migration 0260: Add bonus_max_dice to island_run_runtime_state
--
-- Persistent additive dice-capacity modifier for the Combined Journey Level
-- reroll-capacity reward (feature slice R7). Dice capacity is otherwise purely
-- level-derived; this column layers a permanent bonus on top of the level tier.
--
-- The commit RPC (island_run_commit_action) populates rows generically via
-- jsonb_populate_record, so this column is persisted automatically once the
-- client payload includes it — no RPC change required.

ALTER TABLE IF EXISTS island_run_runtime_state
  ADD COLUMN IF NOT EXISTS bonus_max_dice INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN island_run_runtime_state.bonus_max_dice IS
  'Persistent additive dice-capacity bonus (Combined Journey Level reroll-capacity reward). Added on top of the level-derived max dice.';
