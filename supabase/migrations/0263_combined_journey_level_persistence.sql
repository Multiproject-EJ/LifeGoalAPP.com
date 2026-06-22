-- ============================================================
-- COMBINED JOURNEY LEVEL PERSISTENCE
-- Migration 0263: persist a write-through snapshot of each user's
--   derived Combined Journey Level so the leaderboard (a cross-user
--   server query) can rank by the canonical progression metric.
--
-- Background: the Combined Journey Level (see
--   src/features/gamification/level-worlds/services/combinedJourneyLevel.ts)
--   is DERIVED from durable milestones and is the canonical score
--   for player rank and the leaderboard. It is computed client-side
--   and was previously never persisted, so the leaderboard could not
--   order by it. These columns hold a snapshot written through when a
--   user views their dual-track progress.
--
-- These values are display/ranking only. They are always recomputable
-- from milestones and are NOT an authoritative economy balance — the
-- accrued XP/gold economy (total_xp / total_points) is unchanged.
--
-- Convergence: existing users default to (level 1, xp 0) and populate
-- their real value the next time they open Game Progress. No accurate
-- server-side backfill is possible because the inputs are aggregated
-- client-side; a backfill job can be added later if needed.
-- ============================================================

ALTER TABLE public.gamification_profiles
  ADD COLUMN IF NOT EXISTS combined_journey_level INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS combined_journey_xp INT NOT NULL DEFAULT 0;

-- Leaderboard ordering: highest journey xp first, then level, then a
-- deterministic user_id tiebreaker. Partial index matches the
-- leaderboard's gamification_enabled filter.
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_combined_journey
  ON public.gamification_profiles (combined_journey_xp DESC, combined_journey_level DESC, user_id ASC)
  WHERE gamification_enabled = true;

COMMENT ON COLUMN public.gamification_profiles.combined_journey_level IS
  'Write-through snapshot of the derived Combined Journey Level (combinedJourneyLevel.ts). Display/leaderboard only; recomputable from milestones.';
COMMENT ON COLUMN public.gamification_profiles.combined_journey_xp IS
  'Write-through snapshot of derived Combined Journey XP; canonical leaderboard score. Display/ranking only.';
