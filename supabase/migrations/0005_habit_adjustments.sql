-- Migration: Add habit_adjustments table for storing performance classification suggestions
-- This table is optional and used for auditing suggestion history.
-- If this table doesn't exist, the application will gracefully no-op persistence operations.

CREATE TABLE IF NOT EXISTS public.habit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  classification text,
  suggested_action text,
  rationale text,
  old_schedule jsonb,
  new_schedule jsonb,
  old_target_num numeric,
  new_target_num numeric,
  applied boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS habit_adjustments_habit_id_idx ON public.habit_adjustments(habit_id);
