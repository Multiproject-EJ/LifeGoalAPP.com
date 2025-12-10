-- Meditation reminders table and policies

-- Ensure pgcrypto for gen_random_uuid
DO $$
BEGIN
  PERFORM gen_random_uuid();
EXCEPTION
  WHEN undefined_function THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
END$$;

-- Helper function to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_meditation_reminders_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.meditation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  time_of_day text NOT NULL DEFAULT '08:00',
  timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_meditation_reminders_user_id ON public.meditation_reminders(user_id);

DROP TRIGGER IF EXISTS set_meditation_reminders_updated_at ON public.meditation_reminders;
CREATE TRIGGER set_meditation_reminders_updated_at
BEFORE UPDATE ON public.meditation_reminders
FOR EACH ROW
EXECUTE FUNCTION public.set_meditation_reminders_updated_at();

ALTER TABLE public.meditation_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meditation_reminders'
      AND policyname = 'own meditation reminders'
  ) THEN
    EXECUTE 'DROP POLICY "own meditation reminders" ON public.meditation_reminders';
  END IF;
END$$;

CREATE POLICY "own meditation reminders" ON public.meditation_reminders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE public.meditation_reminders IS 'Stores daily reminder preferences for meditation/breathing space feature';
COMMENT ON COLUMN public.meditation_reminders.enabled IS 'Whether the daily reminder is enabled';
COMMENT ON COLUMN public.meditation_reminders.time_of_day IS 'Time of day for the reminder in HH:MM format';
COMMENT ON COLUMN public.meditation_reminders.timezone IS 'User timezone for scheduling (optional)';
