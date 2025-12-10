-- Meditation reminders table and policies
-- Description: Create meditation_reminders table for user-specific breathing space reminder preferences

-- Ensure pgcrypto for gen_random_uuid
DO $$
BEGIN
  PERFORM gen_random_uuid();
EXCEPTION
  WHEN undefined_function THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
END$$;

CREATE TABLE IF NOT EXISTS public.meditation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  time_of_day text NOT NULL DEFAULT '08:00',
  timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index on user_id to support single reminder per user
CREATE UNIQUE INDEX IF NOT EXISTS meditation_reminders_user_id_key 
ON public.meditation_reminders (user_id);

-- Enable RLS
ALTER TABLE public.meditation_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
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

-- Create policy: users can only access their own meditation reminders
CREATE POLICY "own meditation reminders" ON public.meditation_reminders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_meditation_reminders_user_id ON public.meditation_reminders(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meditation_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_meditation_reminders_updated_at
  BEFORE UPDATE ON public.meditation_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_meditation_reminders_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.meditation_reminders IS 'Stores user preferences for breathing space meditation reminders';
COMMENT ON COLUMN public.meditation_reminders.enabled IS 'Whether reminders are enabled for this user';
COMMENT ON COLUMN public.meditation_reminders.time_of_day IS 'Preferred time of day for reminder in HH:MM format';
COMMENT ON COLUMN public.meditation_reminders.timezone IS 'User timezone for scheduling reminders';
