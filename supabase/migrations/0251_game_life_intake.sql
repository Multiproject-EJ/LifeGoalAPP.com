-- ========================================================
-- GAME LIFE INTAKE
-- Migration 0251: dedicated table for life signal collected
-- from in-game surfaces (Island Run landmarks, etc).
--
-- This is process signal (answers, skips, feedback) gathered
-- by the game, kept separate from the authoritative habits_v2 /
-- goals / checkins records it may spawn and link to.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.game_life_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Where the signal came from, e.g. 'island_run'.
  source TEXT NOT NULL DEFAULT 'island_run',
  -- Island number when the source is Island Run (nullable for other sources).
  island_number INTEGER NULL,
  -- The in-game surface, e.g. 'habit_landmark' | 'wisdom_landmark' | 'mystery_checkin'.
  prompt_context TEXT NOT NULL,
  -- Curriculum stage: baseline | habit_fit | motivation | environment | reflection.
  intake_stage TEXT NULL,
  -- Canonical life-wheel area name (Health, Mind, Work, Money, Love, Connections, Home, Fun).
  life_wheel_area TEXT NULL,
  -- Stage-specific answers (energy/time/style, blocker, why, cue, sizing, ...).
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Lifecycle of this intake row: accepted | completed | skipped.
  state TEXT NOT NULL DEFAULT 'completed',
  linked_habit_id UUID NULL REFERENCES public.habits_v2(id) ON DELETE SET NULL,
  linked_goal_id UUID NULL,
  linked_checkin_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_life_intake_user_created
  ON public.game_life_intake(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_life_intake_user_area
  ON public.game_life_intake(user_id, life_wheel_area)
  WHERE life_wheel_area IS NOT NULL;

ALTER TABLE public.game_life_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_game_life_intake_select" ON public.game_life_intake;
CREATE POLICY "own_game_life_intake_select" ON public.game_life_intake
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_game_life_intake_insert" ON public.game_life_intake;
CREATE POLICY "own_game_life_intake_insert" ON public.game_life_intake
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      linked_habit_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.habits_v2
        WHERE habits_v2.id = game_life_intake.linked_habit_id
          AND habits_v2.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "own_game_life_intake_update" ON public.game_life_intake;
CREATE POLICY "own_game_life_intake_update" ON public.game_life_intake
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_game_life_intake_delete" ON public.game_life_intake;
CREATE POLICY "own_game_life_intake_delete" ON public.game_life_intake
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.game_life_intake IS
  'Life signal collected from in-game surfaces (Island Run landmarks). Process data kept separate from authoritative habits/goals/checkins; rows may link to the records they spawn.';
