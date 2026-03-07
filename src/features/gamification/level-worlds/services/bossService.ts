/**
 * bossService.ts — M7-COMPLETE
 *
 * Deterministic boss type resolution, difficulty scaling, and trial configuration
 * per docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md §2 and
 * docs/07_MAIN_GAME_PROGRESS.md.
 *
 * Boss type distribution: ~75% Milestone Boss, ~25% Fight Boss.
 * Boss type is fixed per island and seeded by island number.
 */

export type BossType = 'milestone' | 'fight';

export type BossDifficulty = 'Easy' | 'Medium' | 'Medium-Hard' | 'Hard' | 'Very Hard';

export interface BossTrialConfig {
  /** Deterministic boss type for this island. */
  type: BossType;
  /** Human-readable difficulty label. */
  difficulty: BossDifficulty;
  /** Countdown duration in seconds for the trial. */
  trialDurationSec: number;
  /** Number of taps (score) required to beat the trial. */
  scoreTarget: number;
  /** Featured game label shown in Milestone Boss description. */
  featuredGame: string;
}

/**
 * Resolve boss type for an island.
 * ~75% Milestone Boss, ~25% Fight Boss (deterministic by island number).
 * Islands where (islandNumber % 4 === 3) are Fight Boss.
 */
export function resolveBossType(islandNumber: number): BossType {
  return islandNumber % 4 === 3 ? 'fight' : 'milestone';
}

/**
 * Get difficulty label scaled by island number per doc §2c.
 */
export function getBossDifficulty(islandNumber: number): BossDifficulty {
  if (islandNumber <= 20) return 'Easy';
  if (islandNumber <= 40) return 'Medium';
  if (islandNumber <= 60) return 'Medium-Hard';
  // Both 61–80 and 81–100 are 'Hard' per canonical spec (doc §2c: matching sub-level ranges)
  if (islandNumber <= 100) return 'Hard';
  return 'Very Hard';
}

/**
 * Trial countdown duration in seconds, scaled by island difficulty.
 * Harder islands give less time.
 */
export function getBossTrialDurationSec(islandNumber: number): number {
  if (islandNumber <= 20) return 60;
  if (islandNumber <= 40) return 50;
  if (islandNumber <= 60) return 45;
  if (islandNumber <= 80) return 40;
  if (islandNumber <= 100) return 35;
  return 30;
}

/**
 * Score target (tap count) required to complete the trial, scaled by difficulty.
 */
export function getBossScoreTarget(islandNumber: number): number {
  if (islandNumber <= 20) return 5;
  if (islandNumber <= 40) return 7;
  if (islandNumber <= 60) return 9;
  if (islandNumber <= 80) return 11;
  if (islandNumber <= 100) return 13;
  return 15;
}

/**
 * Aggregate all boss trial configuration for an island into one object.
 */
export function getBossTrialConfig(islandNumber: number): BossTrialConfig {
  const type = resolveBossType(islandNumber);
  return {
    type,
    difficulty: getBossDifficulty(islandNumber),
    trialDurationSec: getBossTrialDurationSec(islandNumber),
    scoreTarget: getBossScoreTarget(islandNumber),
    featuredGame: type === 'fight' ? 'ShooterBlitz' : 'Island Mini-Game',
  };
}

/**
 * Get a human-readable description of the boss challenge for the given island.
 */
export function getBossChallengeText(islandNumber: number): string {
  const { type, difficulty, scoreTarget, featuredGame } = getBossTrialConfig(islandNumber);
  if (type === 'fight') {
    return `Fight Boss — ShooterBlitz wave assault. Reach ${scoreTarget} hits in time. Difficulty: ${difficulty}.`;
  }
  return `Milestone Boss — Complete ${scoreTarget} actions using ${featuredGame}. Difficulty: ${difficulty}.`;
}

/**
 * Get the color accent for the boss type badge.
 */
export function getBossTypeColor(type: BossType): string {
  return type === 'fight' ? '#ff6b4a' : '#daa520';
}
