-- AI Settings Table
-- Stores user-specific AI provider configurations (API keys, models, etc.)

CREATE TABLE IF NOT EXISTS ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own AI settings
CREATE POLICY "Users can view own ai_settings"
  ON ai_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own AI settings
CREATE POLICY "Users can insert own ai_settings"
  ON ai_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own AI settings
CREATE POLICY "Users can update own ai_settings"
  ON ai_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own AI settings
CREATE POLICY "Users can delete own ai_settings"
  ON ai_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_provider ON ai_settings(provider);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to the table
COMMENT ON TABLE ai_settings IS 'Stores user-specific AI provider configurations including API keys and preferred models';
COMMENT ON COLUMN ai_settings.user_id IS 'Foreign key to auth.users';
COMMENT ON COLUMN ai_settings.provider IS 'AI provider name (e.g., openai, anthropic)';
COMMENT ON COLUMN ai_settings.api_key IS 'User-specific API key for the provider (encrypted at rest)';
COMMENT ON COLUMN ai_settings.model IS 'Preferred AI model for this user (e.g., gpt-4, gpt-4.1-mini)';
