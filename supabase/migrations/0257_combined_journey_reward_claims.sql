-- ============================================================
-- COMBINED JOURNEY REWARD CLAIMS
-- Migration 0257: Idempotency ledger for Combined Journey Level
--   threshold chests (Combined Journey Level feature, slice R3).
--
-- Schema only. No rewards are granted by this migration. The
-- server-authoritative claim path (a SECURITY DEFINER RPC that
-- grants exactly one reward per chest) lands in slice R4.
--
-- Idempotency backbone: PRIMARY KEY (user_id, threshold_level)
-- guarantees a given threshold chest can be claimed at most once
-- per user, regardless of client retries or races.
--
-- Security: RLS grants users SELECT on their own rows only. There
-- is intentionally NO insert/update/delete policy, so clients can
-- never write the ledger directly — writes flow exclusively through
-- the R4 claim RPC / service-role path.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.combined_journey_reward_claims (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threshold_level INTEGER NOT NULL CHECK (threshold_level >= 1),
  reward_kind TEXT NOT NULL CHECK (reward_kind IN ('dice', 'essence', 'egg', 'reroll_capacity')),
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, threshold_level)
);

-- Recent-claims lookups for telemetry / support.
CREATE INDEX IF NOT EXISTS idx_combined_journey_reward_claims_claimed_at
  ON public.combined_journey_reward_claims(claimed_at DESC);

ALTER TABLE public.combined_journey_reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_combined_journey_reward_claims_select" ON public.combined_journey_reward_claims;
CREATE POLICY "own_combined_journey_reward_claims_select" ON public.combined_journey_reward_claims
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.combined_journey_reward_claims IS
  'Idempotency ledger for Combined Journey Level threshold chests. One row per (user, threshold_level); a row means that chest''s single reward was granted. Writes occur only via the server-authoritative claim path (slice R4).';
COMMENT ON COLUMN public.combined_journey_reward_claims.threshold_level IS
  'The Combined Journey Level whose chest was claimed.';
COMMENT ON COLUMN public.combined_journey_reward_claims.reward_kind IS
  'The single reward granted for this chest: dice | essence | egg | reroll_capacity.';
COMMENT ON COLUMN public.combined_journey_reward_claims.reward_amount IS
  'Amount granted for currency-style rewards (dice/essence/reroll_capacity); eggs use the configured egg grant.';
