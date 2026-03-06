/**
 * contractTestUtils.ts
 * Pure utility functions for testing contract engine logic.
 * These can be used by a future test runner (vitest/jest) when added to the project.
 * All functions are pure, side-effect-free, and stateless.
 */

import {
  escalationLevelToMultiplier,
  calculateReliabilityRating,
  checkSacredContractLimit,
  checkSameContractCooldown,
  MAX_ESCALATION_LEVEL,
  SACRED_CONTRACTS_PER_YEAR,
} from './contractIntegrity';
import type { CommitmentContract, ReputationTier } from '../types/gamification';

// =====================================================
// ESCALATION MULTIPLIER TESTS
// =====================================================

/** Expected: escalation multiplier at level 0 = 1.0 */
export function test_escalationLevel0(): boolean {
  const mult = escalationLevelToMultiplier(0);
  return mult === 1.0;
}

/** Expected: escalation multiplier at level 2 = 2.0 */
export function test_escalationLevel2(): boolean {
  const mult = escalationLevelToMultiplier(2);
  return mult === 2.0;
}

/** Expected: escalation multiplier caps at 3.0 (level 4+) */
export function test_escalationLevelCap(): boolean {
  const mult4 = escalationLevelToMultiplier(MAX_ESCALATION_LEVEL);
  const mult10 = escalationLevelToMultiplier(10);
  return mult4 === 3.0 && mult10 === 3.0;
}

// =====================================================
// REPUTATION SCORE CALCULATION
// =====================================================

/** Expected: reliability rating of 8/10 = 0.8 */
export function test_reliabilityRating(): boolean {
  const rating = calculateReliabilityRating(8, 10);
  return Math.abs(rating - 0.8) < 0.001;
}

/** Expected: reliability rating of 0/0 = 0 (no division by zero) */
export function test_reliabilityRatingZero(): boolean {
  const rating = calculateReliabilityRating(0, 0);
  return rating === 0;
}

// =====================================================
// SACRED CONTRACT YEARLY LIMIT
// =====================================================

/** Expected: 0 used → allowed */
export function test_sacredContractLimitAllowed(): boolean {
  const result = checkSacredContractLimit(0);
  return result.allowed === true;
}

/** Expected: 2 used → not allowed */
export function test_sacredContractLimitBlocked(): boolean {
  const result = checkSacredContractLimit(SACRED_CONTRACTS_PER_YEAR);
  return result.allowed === false;
}

/** Expected: 1 used → still allowed */
export function test_sacredContractLimitOneUsed(): boolean {
  const result = checkSacredContractLimit(1);
  return result.allowed === true;
}

// =====================================================
// CONTRACT INTEGRITY COOLDOWN
// =====================================================

function makeContract(overrides: Partial<CommitmentContract>): CommitmentContract {
  return {
    id: 'test-id',
    userId: 'user-1',
    title: 'Test',
    targetType: 'Habit',
    targetId: 'habit-1',
    cadence: 'daily',
    targetCount: 1,
    stakeType: 'gold',
    stakeAmount: 10,
    graceDays: 1,
    coolingOffHours: 24,
    status: 'cancelled',
    currentProgress: 0,
    missCount: 0,
    successCount: 0,
    startAt: new Date().toISOString(),
    endAt: null,
    currentWindowStart: new Date().toISOString(),
    lastEvaluatedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contractType: 'classic',
    contractTier: 'common',
    ...overrides,
  };
}

/** Expected: no recently cancelled contract → allowed */
export function test_cooldownAllowedNoCancelledContract(): boolean {
  const result = checkSameContractCooldown([], 'classic', 'habit-1');
  return result.allowed === true;
}

/** Expected: recently cancelled same type+target → blocked */
export function test_cooldownBlockedRecentCancel(): boolean {
  const recentlyCancelled = makeContract({
    contractType: 'classic',
    targetId: 'habit-1',
    status: 'cancelled',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  });
  const result = checkSameContractCooldown([recentlyCancelled], 'classic', 'habit-1');
  return result.allowed === false;
}

/** Expected: old cancellation (>48h) → allowed */
export function test_cooldownAllowedOldCancel(): boolean {
  const oldlyCancelled = makeContract({
    contractType: 'classic',
    targetId: 'habit-1',
    status: 'cancelled',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 72 hours ago
  });
  const result = checkSameContractCooldown([oldlyCancelled], 'classic', 'habit-1');
  return result.allowed === true;
}

// =====================================================
// REPUTATION TIER DERIVATION
// =====================================================

function deriveReputationTierFromRating(
  reliabilityRating: number,
  contractsStarted: number
): ReputationTier {
  if (contractsStarted < 3) return 'untested';
  if (reliabilityRating < 0.6) return 'apprentice';
  if (reliabilityRating < 0.8) return 'dependable';
  if (reliabilityRating < 0.9) return 'reliable';
  if (reliabilityRating < 0.95) return 'steadfast';
  return 'unbreakable';
}

export function test_reputationTierUntested(): boolean {
  return deriveReputationTierFromRating(0.9, 1) === 'untested';
}

export function test_reputationTierApprentice(): boolean {
  return deriveReputationTierFromRating(0.5, 5) === 'apprentice';
}

export function test_reputationTierUnbreakable(): boolean {
  return deriveReputationTierFromRating(0.97, 10) === 'unbreakable';
}

// =====================================================
// TEST RUNNER (call this from console for manual checks)
// =====================================================

export function runAllContractTests(): { passed: number; failed: number; results: Record<string, boolean> } {
  const tests: Record<string, () => boolean> = {
    escalationLevel0: test_escalationLevel0,
    escalationLevel2: test_escalationLevel2,
    escalationLevelCap: test_escalationLevelCap,
    reliabilityRating: test_reliabilityRating,
    reliabilityRatingZero: test_reliabilityRatingZero,
    sacredContractLimitAllowed: test_sacredContractLimitAllowed,
    sacredContractLimitBlocked: test_sacredContractLimitBlocked,
    sacredContractLimitOneUsed: test_sacredContractLimitOneUsed,
    cooldownAllowedNoCancelledContract: test_cooldownAllowedNoCancelledContract,
    cooldownBlockedRecentCancel: test_cooldownBlockedRecentCancel,
    cooldownAllowedOldCancel: test_cooldownAllowedOldCancel,
    reputationTierUntested: test_reputationTierUntested,
    reputationTierApprentice: test_reputationTierApprentice,
    reputationTierUnbreakable: test_reputationTierUnbreakable,
  };

  const results: Record<string, boolean> = {};
  let passed = 0;
  let failed = 0;

  for (const [name, fn] of Object.entries(tests)) {
    try {
      const result = fn();
      results[name] = result;
      if (result) passed++;
      else failed++;
    } catch (error) {
      results[name] = false;
      failed++;
      console.error(`Test "${name}" threw:`, error);
    }
  }

  return { passed, failed, results };
}
