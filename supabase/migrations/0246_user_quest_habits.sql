-- ========================================================
-- USER QUEST HABITS
-- Migration 0246: Account-level Quest Habit selection
-- ========================================================

CREATE TABLE IF NOT EXISTS public.user_quest_habits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NULL REFERENCES public.habits_v2(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  emoji TEXT NULL,
  cleared_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_quest_habits_habit_id
  ON public.user_quest_habits(habit_id)
  WHERE habit_id IS NOT NULL;

ALTER TABLE public.user_quest_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_user_quest_habits_select" ON public.user_quest_habits;
CREATE POLICY "own_user_quest_habits_select" ON public.user_quest_habits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_user_quest_habits_insert" ON public.user_quest_habits;
CREATE POLICY "own_user_quest_habits_insert" ON public.user_quest_habits
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      habit_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.habits_v2
        WHERE habits_v2.id = user_quest_habits.habit_id
          AND habits_v2.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "own_user_quest_habits_update" ON public.user_quest_habits;
CREATE POLICY "own_user_quest_habits_update" ON public.user_quest_habits
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      habit_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.habits_v2
        WHERE habits_v2.id = user_quest_habits.habit_id
          AND habits_v2.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "own_user_quest_habits_delete" ON public.user_quest_habits;
CREATE POLICY "own_user_quest_habits_delete" ON public.user_quest_habits
  FOR DELETE USING (auth.uid() = user_id);
