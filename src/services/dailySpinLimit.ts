/**
 * Strict-1-per-day clamp helper for the Daily Spin Wheel.
 *
 * Phase 2 of the Minigame & Events Consolidation Plan
 * (`docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §2.4) removes the
 * 2-spin "all-habits-done" bonus, the streak-based +1 spin bonus, and in
 * general enforces "one spin per day, max". This module is the single place
 * that implements that clamp so the rule is easy to audit and unit-test.
 *
 * Lives in its own file (no Supabase or other runtime imports) so the
 * island-run test harness can compile it standalone.
 *
 * When the `todaysOfferSpinEntryEnabled` feature flag is OFF, these helpers
 * return their inputs unchanged so the rollout is strictly opt-in.
 */
import { isIslandRunFeatureEnabled } from '../config/islandRunFeatureFlags';

export const STRICT_DAILY_SPIN_LIMIT = 1;

export function clampSpinsForStrictDailyLimit(spins: number): number {
  if (!isIslandRunFeatureEnabled('todaysOfferSpinEntryEnabled')) {
    return spins;
  }
  if (!Number.isFinite(spins)) return 0;
  return Math.max(0, Math.min(STRICT_DAILY_SPIN_LIMIT, Math.floor(spins)));
}
