-- Description: Store per-user holiday theme preferences

CREATE TABLE IF NOT EXISTS holiday_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  holidays jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE holiday_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their holiday preferences"
  ON holiday_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their holiday preferences"
  ON holiday_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their holiday preferences"
  ON holiday_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their holiday preferences"
  ON holiday_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_holiday_preferences_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_holiday_preferences_updated_at
  BEFORE UPDATE ON holiday_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_holiday_preferences_updated_at();

COMMENT ON TABLE holiday_preferences IS 'Per-user holiday theme preferences used for seasonal experiences';
COMMENT ON COLUMN holiday_preferences.user_id IS 'Reference to the user who owns these preferences';
COMMENT ON COLUMN holiday_preferences.holidays IS 'JSON map of holiday ids to enabled/disabled flags';
COMMENT ON COLUMN holiday_preferences.created_at IS 'Timestamp when the preferences were created';
COMMENT ON COLUMN holiday_preferences.updated_at IS 'Timestamp when the preferences were last updated';
