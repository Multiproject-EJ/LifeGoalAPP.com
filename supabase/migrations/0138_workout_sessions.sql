-- Workout Sessions - Group exercise logs into sessions
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  title TEXT,
  notes TEXT,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link logs to sessions (optional foreign key)
ALTER TABLE public.exercise_logs 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL;

-- Personal records tracking
CREATE TABLE IF NOT EXISTS public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('max_weight', 'max_reps', 'max_volume')),
  value NUMERIC NOT NULL,
  previous_value NUMERIC,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_id UUID REFERENCES public.exercise_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user ON personal_records(user_id, exercise_name);

-- RLS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout sessions" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workout sessions" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout sessions" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workout sessions" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own personal records" ON personal_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own personal records" ON personal_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own personal records" ON personal_records FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own personal records" ON personal_records FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE workout_sessions IS 'Groups exercise logs into workout sessions with optional mood and energy ratings';
COMMENT ON TABLE personal_records IS 'Tracks personal bests for exercises by weight, reps, and volume';
