-- ========================================================
-- COMPASS STATE
-- Migration 0252: the player's assembled Compass template
-- (the "smarter ikigai"). One row per user. Fed by the raw
-- per-stop contributions in game_life_intake (migration 0251).
-- ========================================================

CREATE TABLE IF NOT EXISTS public.compass_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 0 before the first fill, 1 after Compass 1.0, 2 after Compass 2.0.
  template_version INTEGER NOT NULL DEFAULT 0,
  -- Current curriculum phase id, e.g. 'P1'..'P11'.
  current_phase TEXT NULL,
  -- The ikigai "True North" synthesis sentence.
  center_statement TEXT NULL,
  -- The four ikigai directions: { heart, craft, cause, livelihood }.
  directions JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Per-spoke state: { personality: { version, status, entries[] }, habits, goals, shield }.
  spokes JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Audit of finished phases.
  completed_phases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compass_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_compass_state_select" ON public.compass_state;
CREATE POLICY "own_compass_state_select" ON public.compass_state
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_state_insert" ON public.compass_state;
CREATE POLICY "own_compass_state_insert" ON public.compass_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_state_update" ON public.compass_state;
CREATE POLICY "own_compass_state_update" ON public.compass_state
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_state_delete" ON public.compass_state;
CREATE POLICY "own_compass_state_delete" ON public.compass_state
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.compass_state IS
  'Assembled Compass template (smarter ikigai) per user: directions, center, and per-spoke progress. Fed by game_life_intake contributions.';
