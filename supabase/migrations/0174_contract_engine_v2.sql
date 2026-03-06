-- Migration: 0174_contract_engine_v2.sql
-- Contract Engine 2.0 — adds contract types, tier, all new fields, and user_reputation_scores table

-- =====================================================
-- Part 1: Add new columns to commitment_contracts
-- =====================================================

ALTER TABLE commitment_contracts
  ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'classic'
    CHECK (contract_type IN ('classic', 'identity', 'escalation', 'redemption', 'reputation', 'reverse', 'multi_stage', 'future_self', 'narrative', 'sacred', 'cascading')),
  ADD COLUMN IF NOT EXISTS contract_tier TEXT NOT NULL DEFAULT 'common'
    CHECK (contract_tier IN ('common', 'rare', 'epic', 'legendary', 'sacred')),
  ADD COLUMN IF NOT EXISTS identity_statement TEXT,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS base_stake_amount INTEGER,
  ADD COLUMN IF NOT EXISTS redemption_quest_id TEXT,
  ADD COLUMN IF NOT EXISTS redemption_quest_title TEXT,
  ADD COLUMN IF NOT EXISTS redemption_quest_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS future_message TEXT,
  ADD COLUMN IF NOT EXISTS future_message_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS narrative_theme TEXT
    CHECK (narrative_theme IS NULL OR narrative_theme IN ('warrior', 'monk', 'scholar', 'explorer')),
  ADD COLUMN IF NOT EXISTS narrative_rank INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_sacred BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sacred_penalty_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS stages JSONB,
  ADD COLUMN IF NOT EXISTS current_stage_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlocks_contract_id TEXT,
  ADD COLUMN IF NOT EXISTS unlocked_by_contract_id TEXT,
  ADD COLUMN IF NOT EXISTS reliability_score_impact NUMERIC(4,2) NOT NULL DEFAULT 1.0;

-- Update status column to include 'locked'
ALTER TABLE commitment_contracts
  DROP CONSTRAINT IF EXISTS commitment_contracts_status_check;

ALTER TABLE commitment_contracts
  ADD CONSTRAINT commitment_contracts_status_check
    CHECK (status IN ('locked', 'draft', 'active', 'paused', 'completed', 'cancelled'));

-- =====================================================
-- Part 2: Create user_reputation_scores table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_reputation_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contracts_started INTEGER NOT NULL DEFAULT 0,
  contracts_completed INTEGER NOT NULL DEFAULT 0,
  contracts_failed INTEGER NOT NULL DEFAULT 0,
  contracts_cancelled INTEGER NOT NULL DEFAULT 0,
  reliability_rating NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  reliability_tier TEXT NOT NULL DEFAULT 'untested'
    CHECK (reliability_tier IN ('untested', 'apprentice', 'dependable', 'reliable', 'steadfast', 'unbreakable')),
  sacred_contracts_kept INTEGER NOT NULL DEFAULT 0,
  sacred_contracts_broken INTEGER NOT NULL DEFAULT 0,
  sacred_contracts_used_this_year INTEGER NOT NULL DEFAULT 0,
  sacred_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  longest_contract_streak INTEGER NOT NULL DEFAULT 0,
  total_stake_earned INTEGER NOT NULL DEFAULT 0,
  total_stake_forfeited INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Part 3: RLS policies for user_reputation_scores
-- =====================================================

ALTER TABLE user_reputation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own reputation score"
  ON user_reputation_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own reputation score"
  ON user_reputation_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own reputation score"
  ON user_reputation_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- Part 4: Trigger to update updated_at on reputation
-- =====================================================

CREATE OR REPLACE FUNCTION update_reputation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reputation_timestamp ON user_reputation_scores;

CREATE TRIGGER update_reputation_timestamp
  BEFORE UPDATE ON user_reputation_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_reputation_updated_at();

-- =====================================================
-- Part 5: Index for cascading contract lookups
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_commitment_contracts_unlocks
  ON commitment_contracts (unlocks_contract_id)
  WHERE unlocks_contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commitment_contracts_unlocked_by
  ON commitment_contracts (unlocked_by_contract_id)
  WHERE unlocked_by_contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commitment_contracts_type
  ON commitment_contracts (user_id, contract_type);
