/**
 * Compass Book unlock logic — pure functions that translate Island Run position
 * into unlocked curriculum activities.
 *
 * Authority: Island Run state is read-only here. These functions never mutate
 * game state and never block Island Run; reaching an island only unlocks the
 * matching activity, it does not complete it.
 *
 * MVP rule:
 *  - reaching Island N unlocks Compass activity N (and all earlier activities)
 *  - a player who has cycled the board (cycleIndex > 0) has all 120 unlocked
 */

import {
  COMPASS_ACTIVITIES_PER_CHAPTER,
  COMPASS_BOOK_CHAPTER_IDS,
  COMPASS_TOTAL_ISLANDS,
  type CompassBookChapterId,
} from '../types';

export type IslandUnlockInput = {
  currentIslandNumber: number;
  /** Island Run cycle counter; > 0 means the player has completed a full loop. */
  cycleIndex?: number;
};

/** Number of activities unlocked (0..120). */
export function getUnlockedActivityCount(input: IslandUnlockInput): number {
  const cycleIndex = input.cycleIndex ?? 0;
  if (cycleIndex > 0) return COMPASS_TOTAL_ISLANDS;

  const raw = input.currentIslandNumber;
  if (!Number.isFinite(raw)) return 0;
  const n = Math.floor(raw);
  if (n < 1) return 0;
  return Math.min(n, COMPASS_TOTAL_ISLANDS);
}

/** Whether the activity at `islandNumber` is unlocked for the given position. */
export function isActivityUnlocked(islandNumber: number, input: IslandUnlockInput): boolean {
  return getUnlockedActivityCount(input) >= islandNumber;
}

/** 0-based chapter index for an island (1..120 → 0..5). Clamped to range. */
export function getChapterIndexForIsland(islandNumber: number): number {
  const n = clampIsland(islandNumber);
  return Math.floor((n - 1) / COMPASS_ACTIVITIES_PER_CHAPTER);
}

/** 1-based activity index within its chapter (1..20). */
export function getChapterActivityIndexForIsland(islandNumber: number): number {
  const n = clampIsland(islandNumber);
  return ((n - 1) % COMPASS_ACTIVITIES_PER_CHAPTER) + 1;
}

/** Chapter id that contains an island. */
export function getChapterIdForIsland(islandNumber: number): CompassBookChapterId {
  return COMPASS_BOOK_CHAPTER_IDS[getChapterIndexForIsland(islandNumber)];
}

/** The current chapter the player is progressing through, given board position. */
export function getCurrentChapterId(input: IslandUnlockInput): CompassBookChapterId {
  const unlocked = getUnlockedActivityCount(input);
  // Before any unlock, default to the first chapter.
  const island = Math.max(1, Math.min(unlocked || 1, COMPASS_TOTAL_ISLANDS));
  return getChapterIdForIsland(island);
}

function clampIsland(islandNumber: number): number {
  if (!Number.isFinite(islandNumber)) return 1;
  return Math.max(1, Math.min(Math.floor(islandNumber), COMPASS_TOTAL_ISLANDS));
}
