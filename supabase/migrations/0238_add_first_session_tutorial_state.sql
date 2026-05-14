-- Migration 0238: Add persisted Island Run first-session tutorial state.
--
-- Foundation only. This does not change roll randomness, rewards, build
-- behavior, low-dice triggers, pack rewards, or any onboarding UI.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS first_session_tutorial_state text NOT NULL DEFAULT 'not_started';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'island_run_runtime_state_first_session_tutorial_state_check'
      AND conrelid = 'public.island_run_runtime_state'::regclass
  ) THEN
    ALTER TABLE public.island_run_runtime_state
      ADD CONSTRAINT island_run_runtime_state_first_session_tutorial_state_check
      CHECK (
        first_session_tutorial_state IN (
          'not_started',
          'awaiting_first_roll',
          'first_roll_consumed',
          'first_essence_reward_claimed',
          'build_prompt_visible',
          'build_modal_opened',
          'hatchery_l1_built',
          'hatchery_l1_celebrated',
          'normal_play_until_low_dice',
          'first_creature_pack_available',
          'first_creature_pack_opened',
          'first_creature_pack_claimed',
          'complete'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.island_run_runtime_state.first_session_tutorial_state IS
  'Canonical first-session Island Run onboarding state machine marker. Foundation only; not wired to deterministic rolls, reward overrides, overlays, packs, or celebration UI.';
