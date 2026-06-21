/**
 * Combined Journey Level — read-only derivation (R2).
 *
 * Pure, deterministic function of durable milestones so the level can always be
 * recomputed and never silently corrupts. This module performs NO grants and
 * holds NO state; it only derives the displayed level for the dual-track overlay
 * spine. Server-authoritative reward claims are a later slice (see
 * docs/investigations/dual-track-combined-journey-level-rewards-plan.md).
 *
 * Design notes:
 * - XP is derived, not accrued. Inputs are durable milestones (islands
 *   completed, in-island progress, completed goals, habit consistency).
 * - A balance multiplier rewards progressing BOTH sides ("rise together"). It
 *   can only raise XP, never remove earned levels, so the level is monotonic for
 *   a fixed milestone set.
 * - Weights/curve are simple, reviewed constants (see the launch balance review
 *   in the plan doc); tune them here and the SQL ladder stays unaffected since it
 *   keys off threshold level, not XP.
 */

export type CombinedJourneyLevelInput = {
  /** Islands fully completed (durable). */
  islandsCompleted?: number;
  /** Progress within the current island, 0..100. */
  currentIslandProgressPercent?: number;
  /** Count of goals in a completed state (never "goal exists" — anti-farm). */
  completedGoals?: number;
  /**
   * Capped habit-consistency proxy. In R2 this is the active habit count
   * (capped); a richer streak-based score is a later refinement.
   */
  habitConsistencyScore?: number;
};

export type CombinedJourneyLevelSummary = {
  level: number;
  xp: number;
  gameXp: number;
  lifeXp: number;
  balanceMultiplier: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP span from the current level to the next. */
  xpForNextLevel: number;
  /** Fill toward the next level, 0..100. */
  progressPercentToNextLevel: number;
  /** The next chest/threshold level the user is climbing toward. */
  nextThresholdLevel: number;
};

// XP weights — launch-reviewed values (R8 balance pass).
export const JOURNEY_XP_WEIGHTS = {
  perCompletedIsland: 100,
  perCurrentIslandPercent: 1, // up to 100 within the current island
  perCompletedGoal: 60,
  perConsistentHabit: 15,
} as const;

/** Habit consistency is capped so habit count cannot dominate the life side. */
export const HABIT_CONSISTENCY_CAP = 8;

/** Max additive synergy from advancing both sides (balanceMultiplier <= 1 + this). */
export const BALANCE_SYNERGY_MAX = 0.25;

// Level curve: cost to advance from level L to L+1 grows linearly.
export const LEVEL_BASE_XP = 150;
export const LEVEL_STEP_XP = 30;

function sanitizeCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value as number));
}

function sanitizePercent(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value as number));
}

/** Cost to climb from `level` to `level + 1`. */
function xpCostFromLevel(level: number): number {
  return LEVEL_BASE_XP + LEVEL_STEP_XP * Math.max(0, level - 1);
}

/** Total XP required to *reach* `level` (level 1 requires 0). */
export function cumulativeXpForLevel(level: number): number {
  const target = Math.max(1, Math.floor(level));
  const steps = target - 1; // climbs from level 1..target-1
  // sum_{k=1}^{steps} (BASE + STEP*(k-1))
  return LEVEL_BASE_XP * steps + (LEVEL_STEP_XP * steps * (steps - 1)) / 2;
}

/** Largest level (>= 1) whose cumulative requirement is met by `xp`. */
export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

/**
 * Multiplier rewarding balanced progress across both sides. Returns 1 when
 * either side is empty (no synergy), scaling up to 1 + BALANCE_SYNERGY_MAX when
 * the two sides contribute equally.
 */
export function computeBalanceMultiplier(gameXp: number, lifeXp: number): number {
  if (gameXp <= 0 || lifeXp <= 0) return 1;
  const ratio = Math.min(gameXp, lifeXp) / Math.max(gameXp, lifeXp);
  return 1 + BALANCE_SYNERGY_MAX * ratio;
}

export function deriveCombinedJourneyLevel(
  input: CombinedJourneyLevelInput = {},
): CombinedJourneyLevelSummary {
  const islandsCompleted = sanitizeCount(input.islandsCompleted);
  const currentIslandProgress = sanitizePercent(input.currentIslandProgressPercent);
  const completedGoals = sanitizeCount(input.completedGoals);
  const habitConsistency = Math.min(HABIT_CONSISTENCY_CAP, sanitizeCount(input.habitConsistencyScore));

  const gameXp =
    islandsCompleted * JOURNEY_XP_WEIGHTS.perCompletedIsland +
    currentIslandProgress * JOURNEY_XP_WEIGHTS.perCurrentIslandPercent;
  const lifeXp =
    completedGoals * JOURNEY_XP_WEIGHTS.perCompletedGoal +
    habitConsistency * JOURNEY_XP_WEIGHTS.perConsistentHabit;

  const balanceMultiplier = computeBalanceMultiplier(gameXp, lifeXp);
  const xp = Math.round((gameXp + lifeXp) * balanceMultiplier);

  const level = levelForXp(xp);
  const levelFloor = cumulativeXpForLevel(level);
  const nextLevelFloor = cumulativeXpForLevel(level + 1);
  const xpForNextLevel = Math.max(1, nextLevelFloor - levelFloor);
  const xpIntoLevel = Math.max(0, xp - levelFloor);
  const progressPercentToNextLevel = Math.min(
    100,
    Math.max(0, Math.round((xpIntoLevel / xpForNextLevel) * 100)),
  );

  return {
    level,
    xp,
    gameXp: Math.round(gameXp),
    lifeXp: Math.round(lifeXp),
    balanceMultiplier,
    xpIntoLevel,
    xpForNextLevel,
    progressPercentToNextLevel,
    nextThresholdLevel: level + 1,
  };
}
