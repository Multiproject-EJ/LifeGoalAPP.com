/**
 * Landmark flags: one glance tells whether a landmark still needs work.
 * - no flag: not started yet;
 * - red (glowing): building has started but it is not finished;
 * - green: built to Level 3 — the landmark is 100% done.
 * Shown on the 3D board beside each landmark, on its label and in the
 * Mission Phone. Presentation only.
 */
export type LandmarkFlag = 'none' | 'red' | 'green';

export const LANDMARK_FLAG_DONE_LEVEL = 3;

export function resolveLandmarkFlag(options: { level: number; percent?: number }): LandmarkFlag {
  const level = Number.isFinite(options.level) ? Math.floor(options.level) : 0;
  const percent = Number.isFinite(options.percent) ? Number(options.percent) : 0;
  if (level >= LANDMARK_FLAG_DONE_LEVEL || percent >= 100) return 'green';
  if (level >= 1 || percent > 0) return 'red';
  return 'none';
}

export const LANDMARK_FLAG_LABEL: Record<LandmarkFlag, string> = {
  none: 'Not started',
  red: 'In progress',
  green: 'Done',
};
