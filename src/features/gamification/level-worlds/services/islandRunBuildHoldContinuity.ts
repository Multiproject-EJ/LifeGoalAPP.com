import { MAX_BUILD_LEVEL } from './islandRunBuildConstants';

/**
 * Hold-to-build runs continuously from Level 1 to Level 3 on the same
 * landmark (user request 2026-09-30): L1 and L2 level-ups no longer stop the
 * hold behind a review; Level 3 (the milestone) still pauses, and the first
 * Hatchery tutorial keeps its guided beat. Presentation policy only.
 */
export function shouldContinueBuildHoldThroughLevel(options: {
  holdActive: boolean;
  playerHolding: boolean;
  tutorialGuidance: boolean;
  nextBuildLevel: number;
}): boolean {
  return options.holdActive
    && options.playerHolding
    && !options.tutorialGuidance
    && options.nextBuildLevel < MAX_BUILD_LEVEL;
}
