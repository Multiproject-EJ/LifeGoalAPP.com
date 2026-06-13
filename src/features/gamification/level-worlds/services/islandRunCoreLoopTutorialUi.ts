import type { IslandRunFirstSessionTutorialState } from './islandRunGameStateStore';

/**
 * Core-loop "how to play" coachmarks (Phase 3).
 *
 * The existing first-session tutorial teaches the build + creature-pack arc but
 * is silent on the core loop (roll the dice → move → land on a tile → earn
 * essence → build). These helpers add lightweight, non-blocking coachmarks at
 * the states that previously showed the player nothing.
 */

export type IslandRunCoachmarkCopy = {
  title: string;
  body: string;
};

export const ISLAND_RUN_FIRST_ROLL_COACHMARK_COPY: IslandRunCoachmarkCopy = {
  title: '🎲 Roll the dice',
  body: 'Tap Roll to move along the island and land on your first reward.',
};

export const ISLAND_RUN_KEEP_ROLLING_COACHMARK_COPY: IslandRunCoachmarkCopy = {
  title: '🎲 Keep rolling to explore',
  body: 'Every tile you land on hands you a reward. Keep rolling to uncover what’s next.',
};

/**
 * The very first action a new player must take. Shown until they roll, which
 * advances the tutorial out of `awaiting_first_roll`.
 */
export function isIslandRunFirstRollCoachmarkActive(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): boolean {
  return firstSessionTutorialState === 'awaiting_first_roll';
}

/**
 * Free-play nudge after the hatchery celebration, encouraging the player to
 * keep rolling. It clears itself once the low-dice creature pack triggers.
 */
export function isIslandRunKeepRollingCoachmarkActive(
  firstSessionTutorialState: IslandRunFirstSessionTutorialState,
): boolean {
  return firstSessionTutorialState === 'hatchery_l1_celebrated'
    || firstSessionTutorialState === 'normal_play_until_low_dice';
}
