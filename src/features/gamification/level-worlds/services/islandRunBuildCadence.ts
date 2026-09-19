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
 */
export function resolveIslandRunBuildHoldCadence(completedSteps: number): IslandRunBuildHoldCadence {
  const safeSteps = Math.max(0, Math.floor(Number.isFinite(completedSteps) ? completedSteps : 0));
  if (safeSteps >= 3) {
    return {
      delayMs: 140,
      phase: 'maximum',
      feedbackLabel: '🚀 Maximum build speed · full animation running',
    };
  }
  if (safeSteps >= 1) {
    return {
      delayMs: safeSteps >= 2 ? 160 : 200,
      phase: 'rapid',
      feedbackLabel: '⚡ Rapid build · every part animating',
    };
  }
  return {
    delayMs: 240,
    phase: 'warming',
    feedbackLabel: '⚒️ Rapid build charging…',
  };
}
