export const BUILD_REPEAT_STREAK_RESET_MS = 1_200;
export const LEGACY_MAX_BUILD_BATCH_STEPS = 4;
export const MAX_BUILD_BATCH_SPEED_FACTOR = 7;
export const MAX_REPEATED_BUILD_BATCH_STEPS = LEGACY_MAX_BUILD_BATCH_STEPS * MAX_BUILD_BATCH_SPEED_FACTOR;
export const BUILD_REPEAT_STREAK_MAX = 6;

const REPEATED_BUILD_BATCH_STEPS: readonly number[] = [
  1,
  2,
  4,
  8,
  16,
  MAX_REPEATED_BUILD_BATCH_STEPS,
];

export type BuildRepeatStreakState = {
  stopIndex: number | null;
  count: number;
  lastAcceptedAtMs: number | null;
};

export function getInitialBuildRepeatStreakState(): BuildRepeatStreakState {
  return {
    stopIndex: null,
    count: 0,
    lastAcceptedAtMs: null,
  };
}

export function resolveRepeatedBuildBatchSteps(streakCount: number): number {
  if (!Number.isFinite(streakCount)) return 1;
  const normalizedCount = Math.max(1, Math.min(BUILD_REPEAT_STREAK_MAX, Math.floor(streakCount)));
  return REPEATED_BUILD_BATCH_STEPS[normalizedCount - 1] ?? 1;
}

export function resolveNextBuildRepeatStreak(options: {
  current: BuildRepeatStreakState;
  stopIndex: number;
  nowMs: number;
  resetAfterMs?: number;
}): BuildRepeatStreakState {
  const resetAfterMs = options.resetAfterMs ?? BUILD_REPEAT_STREAK_RESET_MS;
  const normalizedStopIndex = Math.max(0, Math.floor(options.stopIndex));
  const previousAcceptedAtMs = options.current.lastAcceptedAtMs;
  const isSameStop = options.current.stopIndex === normalizedStopIndex;
  const isFreshEnough = typeof previousAcceptedAtMs === 'number'
    && Number.isFinite(previousAcceptedAtMs)
    && options.nowMs - previousAcceptedAtMs <= resetAfterMs;
  const nextCount = isSameStop && isFreshEnough
    ? Math.min(BUILD_REPEAT_STREAK_MAX, Math.max(0, Math.floor(options.current.count)) + 1)
    : 1;

  return {
    stopIndex: normalizedStopIndex,
    count: nextCount,
    lastAcceptedAtMs: options.nowMs,
  };
}
