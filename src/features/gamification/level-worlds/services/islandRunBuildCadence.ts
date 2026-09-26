export const ISLAND_RUN_BUILD_TAP_STEP_DELAY_MS = 220;
export const ISLAND_RUN_BUILD_LEVEL_REVIEW_MIN_DWELL_MS = 1_000;
export const ISLAND_RUN_BUILD_LEVEL_AUTO_DISMISS_MS = 1_800;
export const ISLAND_RUN_BUILD_CAMERA_HANDOFF_MS = 380;

export type IslandRunBuildHoldCadence = {
  delayMs: number;
  phase: 'warming' | 'rapid' | 'maximum';
  feedbackLabel: string;
};

/**
 * Hold-to-build remains one awaited canonical spend per visible construction
 * beat. Only the presentation delay accelerates, so persistence, affordability,
 * sound, haptics, robot phases, and level boundaries are never skipped.
 * Each level is five beats; these delays give roughly two seconds of
 * construction to watch per level (doubled from the first tuning).
 */
export function resolveIslandRunBuildHoldCadence(completedSteps: number): IslandRunBuildHoldCadence {
  const safeSteps = Math.max(0, Math.floor(Number.isFinite(completedSteps) ? completedSteps : 0));
  if (safeSteps >= 3) {
    return {
      delayMs: 280,
      phase: 'maximum',
      feedbackLabel: '🚀 Maximum build speed · full animation running',
    };
  }
  if (safeSteps >= 1) {
    return {
      delayMs: safeSteps >= 2 ? 320 : 400,
      phase: 'rapid',
      feedbackLabel: '⚡ Rapid build · every part animating',
    };
  }
  return {
    delayMs: 480,
    phase: 'warming',
    feedbackLabel: '⚒️ Rapid build charging…',
  };
}

/** Auto-build (the Island 18+ Fast Build) plays every beat at twice hold speed. */
export const ISLAND_RUN_AUTO_BUILD_SPEED_FACTOR = 0.5;
/** Fast Build is a late-game convenience; building is meant to be watched. */
export const ISLAND_RUN_AUTO_BUILD_UNLOCK_ISLAND = 18;

export function isIslandRunAutoBuildUnlocked(currentIslandNumber: number, cycleIndex: number): boolean {
  return cycleIndex > 0 || currentIslandNumber >= ISLAND_RUN_AUTO_BUILD_UNLOCK_ISLAND;
}
