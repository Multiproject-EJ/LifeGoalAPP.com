export const JUNGLE_COMPASS_CEREMONY_DURATION_MS = 12_800;
export const JUNGLE_COMPASS_REDUCED_CEREMONY_DURATION_MS = 450;

const SEAL_HINTS = [
  'Ancient compass rings rise and find their alignment.',
  'Emerald currents awaken the temple waterways.',
  'Root-light spreads through the jungle paths.',
  'The temple crown gathers the four awakened seals.',
  'Send their light into the sky. Something is answering.',
] as const;

export function getJungleMissionActionPresentation(stage: number, hasCharge: boolean, completed: boolean) {
  const nextStage = Math.max(0, Math.min(4, Math.floor(stage)));
  return {
    label: completed ? 'Replay the awakening' : hasCharge ? `Awaken seal ${nextStage + 1} of 5` : 'Find a Wayfinder',
    hint: completed
      ? 'The sky opens. Your Compass Book descends.'
      : hasCharge ? SEAL_HINTS[nextStage] : 'A glowing Wayfinder waits along the route.',
  };
}
