-- Retire `hearts` and `coins` columns from the island_run_runtime_state table.
--
-- Context: Hearts and coins were fully retired from gameplay in earlier releases
-- (see CANONICAL_GAMEPLAY_CONTRACT.md §3). The active currencies are now
-- dice, essence, shards, diamonds, and spin tokens. The columns were zeroed out
-- in 0224_corrective_dice_regen_rollout.sql but kept nullable so older clients
-- would not break. Client code no longer reads or writes these columns as of
-- this release, so the columns can now be safely dropped.
--
-- Client-side fallback: the hydration code intentionally tolerates missing
-- `hearts` / `coins` keys (they were removed from the SELECT list and default
-- fallbacks in the matching PR), so older rows surviving this migration
-- will continue to hydrate cleanly for one release cycle.
--
-- Note: `daily_hearts_claimed_day_key` is NOT dropped here — it is a legacy
-- name for a daily-claim tracker (no longer tied to hearts the currency).
-- Renaming it is a separate future cleanup.

ALTER TABLE island_run_runtime_state
  DROP COLUMN IF EXISTS hearts,
  DROP COLUMN IF EXISTS coins;
