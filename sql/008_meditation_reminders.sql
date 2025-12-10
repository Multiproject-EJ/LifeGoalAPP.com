-- Meditation Reminders table and policies
-- Reference SQL for manual setup (duplicates migration 0111)

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create meditation_reminders table
CREATE TABLE IF NOT EXISTS public.meditation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  time_of_day text NOT NULL DEFAULT '08:00',
  timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meditation_reminders_user_id_unique UNIQUE (user_id)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meditation_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_meditation_reminders_updated_at
  BEFORE UPDATE ON public.meditation_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_meditation_reminders_updated_at();

-- Enable Row Level Security
ALTER TABLE public.meditation_reminders ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only access their own meditation reminders
CREATE POLICY "own meditation reminders" ON public.meditation_reminders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_meditation_reminders_user_id ON public.meditation_reminders(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.meditation_reminders IS 'User meditation/breathing reminder preferences';
COMMENT ON COLUMN public.meditation_reminders.user_id IS 'Reference to the user who owns this reminder';
COMMENT ON COLUMN public.meditation_reminders.enabled IS 'Whether the reminder is active';
COMMENT ON COLUMN public.meditation_reminders.time_of_day IS 'Time of day for the reminder (HH:MM format)';
COMMENT ON COLUMN public.meditation_reminders.timezone IS 'User timezone for accurate reminder scheduling';
COMMENT ON COLUMN public.meditation_reminders.created_at IS 'Timestamp when the reminder was created';
COMMENT ON COLUMN public.meditation_reminders.updated_at IS 'Timestamp when the reminder was last updated';
