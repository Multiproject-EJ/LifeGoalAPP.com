/**
 * Daily cap clamp helper for the Daily Spin Wheel.
 *
 * Phase 2 of the Minigame & Events Consolidation Plan
 * (`docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §2.4) removes the
 * legacy streak bonuses and enforces the current daily max policy. This module is the single place
 * that implements that clamp so the rule is easy to audit and unit-test.
 *
 * Lives in its own file (no Supabase or other runtime imports) so the
 * island-run test harness can compile it standalone.
 *
 * When the `todaysOfferSpinEntryEnabled` feature flag is OFF, these helpers
 * return their inputs unchanged so the rollout is strictly opt-in.
 */
import { isIslandRunFeatureEnabled } from '../config/islandRunFeatureFlags';

export const STRICT_DAILY_SPIN_LIMIT = 2;

export function clampSpinsForStrictDailyLimit(spins: number): number {
  if (!isIslandRunFeatureEnabled('todaysOfferSpinEntryEnabled')) {
    return spins;
  }
  if (!Number.isFinite(spins)) return 0;
  return Math.max(0, Math.min(STRICT_DAILY_SPIN_LIMIT, Math.floor(spins)));
}
