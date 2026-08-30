export const ISLAND_RUN_BUILD_TAP_STEP_DELAY_MS = 500;
export const ISLAND_RUN_BUILD_LEVEL_REVIEW_MIN_DWELL_MS = 1_250;
export const ISLAND_RUN_BUILD_LEVEL_AUTO_DISMISS_MS = 2_100;
export const ISLAND_RUN_BUILD_CAMERA_HANDOFF_MS = 600;

export type IslandRunBuildHoldCadence = {
  delayMs: number;
  phase: 'warming' | 'rapid' | 'maximum';
  feedbackLabel: string;
};

/**
 * Hold-to-build remains one awaited canonical spend per visible construction
 * beat. Only the presentation delay accelerates, so persistence, affordability,
 * sound, haptics, robot phases, and level boundaries are never skipped.
 */
export function resolveIslandRunBuildHoldCadence(completedSteps: number): IslandRunBuildHoldCadence {
  const safeSteps = Math.max(0, Math.floor(Number.isFinite(completedSteps) ? completedSteps : 0));
  if (safeSteps >= 3) {
    return {
      delayMs: 160,
      phase: 'maximum',
      feedbackLabel: '🚀 Maximum build speed · full animation running',
    };
  }
  if (safeSteps >= 1) {
    return {
      delayMs: safeSteps >= 2 ? 230 : 320,
      phase: 'rapid',
      feedbackLabel: '⚡ Rapid build · every part animating',
    };
  }
  return {
    delayMs: 420,
    phase: 'warming',
    feedbackLabel: '⚒️ Rapid build charging…',
  };
}
