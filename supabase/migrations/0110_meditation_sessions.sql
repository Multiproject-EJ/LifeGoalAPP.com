-- Meditation sessions table and policies

-- Ensure pgcrypto for gen_random_uuid
DO $$
BEGIN
  PERFORM gen_random_uuid();
EXCEPTION
  WHEN undefined_function THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
END$$;

CREATE TABLE IF NOT EXISTS public.meditation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_date date NOT NULL DEFAULT current_date,
  session_type text NOT NULL DEFAULT 'breathing',
  duration_seconds integer NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  notes text,
  CONSTRAINT meditation_sessions_duration_positive CHECK (duration_seconds > 0)
);

-- Enable RLS
ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meditation_sessions'
      AND policyname = 'own meditation sessions'
  ) THEN
    EXECUTE 'DROP POLICY "own meditation sessions" ON public.meditation_sessions';
  END IF;
END$$;

-- Create policy: users can only access their own meditation sessions
CREATE POLICY "own meditation sessions" ON public.meditation_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_id ON public.meditation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_session_date ON public.meditation_sessions(session_date DESC);

-- Add helpful comments
COMMENT ON TABLE public.meditation_sessions IS 'Stores completed meditation and breathing sessions for users';
COMMENT ON COLUMN public.meditation_sessions.session_type IS 'Type of meditation session (breathing, guided, etc.)';
COMMENT ON COLUMN public.meditation_sessions.duration_seconds IS 'Duration of the session in seconds';
COMMENT ON COLUMN public.meditation_sessions.completed IS 'Whether the session was completed or abandoned';
