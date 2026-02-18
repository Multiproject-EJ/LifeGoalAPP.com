-- ========================================================
-- Commitment Contracts persistence (Phase 7.5 Slice C)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.commitment_contracts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('Habit', 'Goal', 'FocusSession')),
  target_id TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly')),
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  stake_type TEXT NOT NULL CHECK (stake_type IN ('gold', 'tokens')),
  stake_amount INTEGER NOT NULL CHECK (stake_amount > 0),
  grace_days INTEGER NOT NULL DEFAULT 1 CHECK (grace_days >= 0),
  cooling_off_hours INTEGER NOT NULL DEFAULT 24 CHECK (cooling_off_hours >= 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  current_progress INTEGER NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
  miss_count INTEGER NOT NULL DEFAULT 0 CHECK (miss_count >= 0),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  stake_reduced_at TIMESTAMPTZ,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  current_window_start TIMESTAMPTZ NOT NULL,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commitment_contract_evaluations (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES public.commitment_contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  actual_count INTEGER NOT NULL CHECK (actual_count >= 0),
  grace_days_used INTEGER NOT NULL DEFAULT 0 CHECK (grace_days_used >= 0),
  result TEXT NOT NULL CHECK (result IN ('success', 'miss')),
  stake_forfeited INTEGER NOT NULL DEFAULT 0 CHECK (stake_forfeited >= 0),
  bonus_awarded INTEGER NOT NULL DEFAULT 0 CHECK (bonus_awarded >= 0),
  evaluated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commitment_contracts_user_id ON public.commitment_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_commitment_contracts_status ON public.commitment_contracts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_evaluations_user_id ON public.commitment_contract_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_evaluations_contract_id ON public.commitment_contract_evaluations(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_evaluations_evaluated_at ON public.commitment_contract_evaluations(evaluated_at DESC);

ALTER TABLE public.commitment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_contract_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own commitment contracts" ON public.commitment_contracts;
CREATE POLICY "Users can view their own commitment contracts"
  ON public.commitment_contracts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own commitment contracts" ON public.commitment_contracts;
CREATE POLICY "Users can insert their own commitment contracts"
  ON public.commitment_contracts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own commitment contracts" ON public.commitment_contracts;
CREATE POLICY "Users can update their own commitment contracts"
  ON public.commitment_contracts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own commitment contracts" ON public.commitment_contracts;
CREATE POLICY "Users can delete their own commitment contracts"
  ON public.commitment_contracts FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own contract evaluations" ON public.commitment_contract_evaluations;
CREATE POLICY "Users can view their own contract evaluations"
  ON public.commitment_contract_evaluations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contract evaluations" ON public.commitment_contract_evaluations;
CREATE POLICY "Users can insert their own contract evaluations"
  ON public.commitment_contract_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contract evaluations" ON public.commitment_contract_evaluations;
CREATE POLICY "Users can delete their own contract evaluations"
  ON public.commitment_contract_evaluations FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_commitment_contracts_updated_at ON public.commitment_contracts;
CREATE TRIGGER update_commitment_contracts_updated_at
  BEFORE UPDATE ON public.commitment_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

COMMENT ON TABLE public.commitment_contracts IS 'Optional personal commitment contracts with stake and cadence windows.';
COMMENT ON TABLE public.commitment_contract_evaluations IS 'Evaluated outcome records for commitment contract windows.';
