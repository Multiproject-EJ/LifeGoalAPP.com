-- Add optional witness/support metadata for social commitment modes
ALTER TABLE public.commitment_contracts
  ADD COLUMN IF NOT EXISTS accountability_mode TEXT,
  ADD COLUMN IF NOT EXISTS witness_label TEXT;

ALTER TABLE public.commitment_contracts
  DROP CONSTRAINT IF EXISTS commitment_contracts_accountability_mode_check;

ALTER TABLE public.commitment_contracts
  ADD CONSTRAINT commitment_contracts_accountability_mode_check
  CHECK (accountability_mode IS NULL OR accountability_mode IN ('solo', 'witness'));

ALTER TABLE public.commitment_contracts
  DROP CONSTRAINT IF EXISTS commitment_contracts_witness_label_length_check;

ALTER TABLE public.commitment_contracts
  ADD CONSTRAINT commitment_contracts_witness_label_length_check
  CHECK (witness_label IS NULL OR char_length(trim(witness_label)) BETWEEN 1 AND 40);

COMMENT ON COLUMN public.commitment_contracts.accountability_mode IS 'Optional social mode: solo or witness support mode.';
COMMENT ON COLUMN public.commitment_contracts.witness_label IS 'Optional witness/accountability partner display label (max 40 chars).';
