/**
 * contractIntegrity.ts
 * Anti-cheating and integrity checks for Commitment Contracts.
 * All functions are pure and side-effect-free — they take data and return results.
 */

import type { CommitmentContract, ContractType } from '../types/gamification';

// =====================================================
// CONSTANTS
// =====================================================

/** Cooldown period (ms) after cancelling before creating the same contract type + target */
export const SAME_CONTRACT_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours

/** Maximum number of escalation levels (caps stake at 3x base) */
export const MAX_ESCALATION_LEVEL = 4;

/** Maximum stake multiplier from escalation */
export const MAX_ESCALATION_MULTIPLIER = 3.0;

/** Sacred contracts allowed per calendar year */
export const SACRED_CONTRACTS_PER_YEAR = 2;

// =====================================================
// COOLDOWN ENFORCEMENT (Part 18 — 1)
// =====================================================

interface CooldownCheckResult {
  allowed: boolean;
  reason?: string;
  availableAt?: string;
}

/**
 * Checks whether a user can create a new contract of the same type targeting the
 * same habit/goal — enforces a 48-hour cooldown after cancellation.
 */
export function checkSameContractCooldown(
  existingContracts: CommitmentContract[],
  newContractType: ContractType,
  newTargetId: string
): CooldownCheckResult {
  const now = Date.now();

  const recentlyCancelled = existingContracts.find((c) => {
    if (c.status !== 'cancelled') return false;
    if (c.contractType !== newContractType) return false;
    if (c.targetId !== newTargetId) return false;

    const cancelledAt = new Date(c.updatedAt).getTime();
    return now - cancelledAt < SAME_CONTRACT_COOLDOWN_MS;
  });

  if (recentlyCancelled) {
    const availableAt = new Date(
      new Date(recentlyCancelled.updatedAt).getTime() + SAME_CONTRACT_COOLDOWN_MS
    );
    return {
      allowed: false,
      reason: `Cooldown active. You cancelled a ${newContractType} contract for this target recently. Available again ${availableAt.toLocaleDateString()}.`,
      availableAt: availableAt.toISOString(),
    };
  }

  return { allowed: true };
}

// =====================================================
// SACRED CONTRACT LIMIT (Part 18 — 2)
// =====================================================

interface SacredLimitCheckResult {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
}

/**
 * Checks whether the user has reached the sacred contract yearly limit.
 */
export function checkSacredContractLimit(
  sacredContractsUsedThisYear: number
): SacredLimitCheckResult {
  if (sacredContractsUsedThisYear >= SACRED_CONTRACTS_PER_YEAR) {
    return {
      allowed: false,
      reason: `You can only start ${SACRED_CONTRACTS_PER_YEAR} sacred contracts per calendar year. You've used ${sacredContractsUsedThisYear}.`,
      used: sacredContractsUsedThisYear,
      limit: SACRED_CONTRACTS_PER_YEAR,
    };
  }
  return { allowed: true, used: sacredContractsUsedThisYear, limit: SACRED_CONTRACTS_PER_YEAR };
}

// =====================================================
// ESCALATION CAP (Part 18 — 3)
// =====================================================

/**
 * Calculates the new escalation level and multiplier after a miss.
 * Caps at MAX_ESCALATION_LEVEL (4) which produces MAX_ESCALATION_MULTIPLIER (3x).
 */
export function calculateEscalationAfterMiss(currentLevel: number): {
  newLevel: number;
  newMultiplier: number;
} {
  const newLevel = Math.min(MAX_ESCALATION_LEVEL, currentLevel + 1);
  const newMultiplier = Math.min(MAX_ESCALATION_MULTIPLIER, 1.0 + newLevel * 0.5);
  return { newLevel, newMultiplier };
}

/**
 * Calculates effective stake amount applying escalation multiplier.
 */
export function calculateEscalatedStake(baseStake: number, escalationMultiplier: number): number {
  return Math.round(baseStake * Math.min(MAX_ESCALATION_MULTIPLIER, escalationMultiplier));
}

// =====================================================
// RESET ABUSE PREVENTION — CASCADING (Part 18 — 4)
// =====================================================

/**
 * Checks whether resetting a contract should also pause linked cascading contracts.
 * Returns the IDs of cascading contracts that should be paused.
 */
export function getCascadingContractsToPause(
  allContracts: CommitmentContract[],
  resetContractId: string
): string[] {
  const resetContract = allContracts.find((c) => c.id === resetContractId);
  if (!resetContract || !resetContract.unlocksContractId) return [];

  const cascading = allContracts.find(
    (c) => c.id === resetContract.unlocksContractId && c.status === 'active'
  );

  return cascading ? [cascading.id] : [];
}

// =====================================================
// PROGRESS VERIFICATION HELPER (Part 18 — 5)
// =====================================================

/**
 * Verifies that contract progress hasn't been inflated beyond the window target.
 * Returns the verified/capped progress count.
 */
export function verifyProgressCount(
  reportedProgress: number,
  targetCount: number,
  contractType: ContractType
): number {
  // Reverse contracts: progress is violations, no upper cap needed for violations
  if (contractType === 'reverse') return Math.max(0, reportedProgress);

  // Normal contracts: can't exceed target + grace days (capped at 2x target as sanity check)
  const sanityMax = targetCount * 2;
  return Math.min(Math.max(0, reportedProgress), sanityMax);
}

// =====================================================
// RELIABILITY SCORE CALCULATION (Part 3 helper)
// =====================================================

/**
 * Calculates reliability rating (0.0–1.0) from contract completion stats.
 */
export function calculateReliabilityRating(completed: number, total: number): number {
  if (total < 1) return 0;
  return Math.max(0, Math.min(1, completed / total));
}

// =====================================================
// ESCALATION MULTIPLIER (standalone test utility)
// =====================================================

/**
 * Pure function: given an escalation level, returns the stake multiplier.
 */
export function escalationLevelToMultiplier(level: number): number {
  const capped = Math.min(MAX_ESCALATION_LEVEL, Math.max(0, level));
  return Math.min(MAX_ESCALATION_MULTIPLIER, 1.0 + capped * 0.5);
}
