-- Migration 0219: Align token_index with 40-tile ring board.
--
-- The Island Run board was resized from 60 tiles to 40 tiles.  Any previously
-- persisted token_index >= 40 is out of range for the new ring; wrap it modulo 40
-- so the token lands on a valid tile on first load without a hard reset.
-- The column has no upper-bound constraint, so this is a safe one-time data fix.

UPDATE public.island_run_runtime_state
SET    token_index = token_index % 40
WHERE  token_index >= 40;

COMMENT ON COLUMN public.island_run_runtime_state.token_index IS
  'Current token tile index on the 40-tile Island Run ring board (wraps 0..39).';
