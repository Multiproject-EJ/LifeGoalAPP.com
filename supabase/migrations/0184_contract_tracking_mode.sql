-- Contract tracking mode support (progress check-ins vs outcome-only)

ALTER TABLE public.commitment_contracts
  ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'progress'
    CHECK (tracking_mode IN ('progress', 'outcome_only')),
  ADD COLUMN IF NOT EXISTS self_reported_outcome TEXT
    CHECK (self_reported_outcome IS NULL OR self_reported_outcome IN ('success', 'miss'));

COMMENT ON COLUMN public.commitment_contracts.tracking_mode
IS 'Tracking style for contract progression: progress (window check-ins) or outcome_only (failure log + final success).';

COMMENT ON COLUMN public.commitment_contracts.self_reported_outcome
IS 'Optional manual outcome for outcome_only contracts prior to evaluation.';
