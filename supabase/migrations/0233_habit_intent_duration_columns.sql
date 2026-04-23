-- Migration 0233: Add first-class intent and duration program fields to habits_v2
-- Purpose:
--   1) Persist wizard intent/duration in typed columns instead of only JSON metadata
--   2) Keep backward compatibility with existing autoprog.creation_context data

ALTER TABLE public.habits_v2
  ADD COLUMN IF NOT EXISTS habit_intent text,
  ADD COLUMN IF NOT EXISTS duration_mode text,
  ADD COLUMN IF NOT EXISTS duration_value integer,
  ADD COLUMN IF NOT EXISTS duration_unit text,
  ADD COLUMN IF NOT EXISTS duration_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_duration_end text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habits_v2_habit_intent_check'
  ) THEN
    ALTER TABLE public.habits_v2
      ADD CONSTRAINT habits_v2_habit_intent_check
      CHECK (habit_intent IS NULL OR habit_intent IN ('build', 'break'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habits_v2_duration_mode_check'
  ) THEN
    ALTER TABLE public.habits_v2
      ADD CONSTRAINT habits_v2_duration_mode_check
      CHECK (duration_mode IS NULL OR duration_mode IN ('none', 'fixed_window'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habits_v2_duration_unit_check'
  ) THEN
    ALTER TABLE public.habits_v2
      ADD CONSTRAINT habits_v2_duration_unit_check
      CHECK (duration_unit IS NULL OR duration_unit IN ('days', 'weeks', 'months'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habits_v2_on_duration_end_check'
  ) THEN
    ALTER TABLE public.habits_v2
      ADD CONSTRAINT habits_v2_on_duration_end_check
      CHECK (on_duration_end IS NULL OR on_duration_end IN ('pause', 'deactivate'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habits_v2_duration_value_positive_check'
  ) THEN
    ALTER TABLE public.habits_v2
      ADD CONSTRAINT habits_v2_duration_value_positive_check
      CHECK (duration_value IS NULL OR duration_value >= 1);
  END IF;
END $$;

-- Backfill from autoprog.creation_context if available
UPDATE public.habits_v2
SET
  habit_intent = COALESCE(habit_intent, autoprog #>> '{creation_context,intent}'),
  duration_mode = COALESCE(duration_mode, autoprog #>> '{creation_context,duration,mode}'),
  duration_value = COALESCE(duration_value, NULLIF(autoprog #>> '{creation_context,duration,value}', '')::integer),
  duration_unit = COALESCE(duration_unit, autoprog #>> '{creation_context,duration,unit}'),
  on_duration_end = COALESCE(on_duration_end, autoprog #>> '{creation_context,duration,onEnd}'),
  duration_start_at = COALESCE(duration_start_at, created_at)
WHERE autoprog IS NOT NULL;

-- Normalize defaults when missing
UPDATE public.habits_v2
SET habit_intent = COALESCE(habit_intent, 'build');

UPDATE public.habits_v2
SET duration_mode = COALESCE(duration_mode, 'none');

-- Compute duration_end_at where fixed window data exists
UPDATE public.habits_v2
SET duration_end_at = CASE
  WHEN duration_mode = 'fixed_window'
    AND duration_value IS NOT NULL
    AND duration_unit IS NOT NULL
    AND duration_start_at IS NOT NULL
  THEN duration_start_at + CASE duration_unit
    WHEN 'days' THEN make_interval(days => duration_value)
    WHEN 'weeks' THEN make_interval(days => duration_value * 7)
    WHEN 'months' THEN make_interval(months => duration_value)
    ELSE interval '0 days'
  END
  ELSE duration_end_at
END;

CREATE INDEX IF NOT EXISTS habits_v2_duration_end_idx
  ON public.habits_v2 (duration_end_at)
  WHERE duration_mode = 'fixed_window' AND status = 'active';

COMMENT ON COLUMN public.habits_v2.habit_intent IS 'Wizard intent: build good behavior or break/reduce bad behavior.';
COMMENT ON COLUMN public.habits_v2.duration_mode IS 'Duration mode: none or fixed_window.';
COMMENT ON COLUMN public.habits_v2.duration_value IS 'Duration quantity when fixed_window is enabled.';
COMMENT ON COLUMN public.habits_v2.duration_unit IS 'Duration unit for fixed_window: days, weeks, months.';
COMMENT ON COLUMN public.habits_v2.duration_start_at IS 'Program start timestamp for duration-bound habits.';
COMMENT ON COLUMN public.habits_v2.duration_end_at IS 'Program computed end timestamp for duration-bound habits.';
COMMENT ON COLUMN public.habits_v2.on_duration_end IS 'Action when duration ends: pause or deactivate.';
