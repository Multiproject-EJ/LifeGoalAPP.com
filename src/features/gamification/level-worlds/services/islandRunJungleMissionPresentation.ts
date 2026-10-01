export const JUNGLE_COMPASS_CEREMONY_DURATION_MS = 12_800;
export const JUNGLE_COMPASS_REDUCED_CEREMONY_DURATION_MS = 450;

const SEAL_HINTS = [
  'Ancient compass rings rise and find their alignment.',
  'Emerald currents awaken the temple waterways.',
  'Root-light spreads through the jungle paths.',
  'The temple crown gathers the four awakened seals.',
  'Send their light into the sky. Something is answering.',
] as const;

export function getJungleMissionActionPresentation(stage: number, _hasCharge: boolean, completed: boolean) {
  const nextStage = Math.max(0, Math.min(4, Math.floor(stage)));
  return {
    // Seals are lit by answering the masked caretaker's baseline questions;
    // `hasCharge` is kept for older call sites but no longer gates the copy.
    label: completed ? 'Replay the awakening' : `Seal ${nextStage + 1} of 5 · answer the caretaker`,
    hint: completed
      ? 'The sky opens. Your Compass Book descends.'
      : `${SEAL_HINTS[nextStage]} Roll on: the masked caretaker appears where you land with a question.`,
  };
}
