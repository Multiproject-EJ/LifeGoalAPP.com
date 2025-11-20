-- Migration: AI Settings
-- Description: Create ai_settings table for user-specific AI configurations
-- Required for: AI-powered goal suggestions and other AI features

-- Create ai_settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai',
  api_key TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);

-- Add index on provider for potential multi-provider support
CREATE INDEX IF NOT EXISTS idx_ai_settings_provider ON ai_settings(provider);

-- Enable Row Level Security
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own AI settings
CREATE POLICY "Users can view their own AI settings"
  ON ai_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own AI settings
CREATE POLICY "Users can insert their own AI settings"
  ON ai_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own AI settings
CREATE POLICY "Users can update their own AI settings"
  ON ai_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own AI settings
CREATE POLICY "Users can delete their own AI settings"
  ON ai_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_settings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE ai_settings IS 'User-specific AI provider configurations and API keys';
COMMENT ON COLUMN ai_settings.user_id IS 'Reference to the user who owns this configuration';
COMMENT ON COLUMN ai_settings.provider IS 'AI provider name (e.g., openai, anthropic)';
COMMENT ON COLUMN ai_settings.api_key IS 'User-provided API key for the AI provider (encrypted at rest)';
COMMENT ON COLUMN ai_settings.model IS 'Preferred AI model for this user (e.g., gpt-4o-mini, gpt-4o)';
COMMENT ON COLUMN ai_settings.created_at IS 'Timestamp when the settings were created';
COMMENT ON COLUMN ai_settings.updated_at IS 'Timestamp when the settings were last updated';
