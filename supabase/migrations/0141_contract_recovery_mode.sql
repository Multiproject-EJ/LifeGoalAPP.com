-- ========================================================
-- Commitment Contracts guided recovery mode
-- ========================================================

ALTER TABLE public.commitment_contracts
  ADD COLUMN IF NOT EXISTS recovery_mode TEXT CHECK (recovery_mode IN ('gentle_ramp')),
  ADD COLUMN IF NOT EXISTS recovery_original_target_count INTEGER CHECK (recovery_original_target_count > 0),
  ADD COLUMN IF NOT EXISTS recovery_activated_at TIMESTAMPTZ;
