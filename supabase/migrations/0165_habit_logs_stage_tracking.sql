-- Migration 0165: Add stage tracking for scaled habit logging

ALTER TABLE public.habit_logs_v2
ADD COLUMN IF NOT EXISTS logged_stage TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habit_logs_v2_logged_stage_check'
  ) THEN
    ALTER TABLE public.habit_logs_v2
    ADD CONSTRAINT habit_logs_v2_logged_stage_check
    CHECK (logged_stage IS NULL OR logged_stage IN ('seed', 'minimum', 'standard'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_habit_logs_v2_logged_stage ON public.habit_logs_v2(logged_stage);
