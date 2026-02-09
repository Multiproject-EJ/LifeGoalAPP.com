import {
  POMODORO_SPRINT_REWARDS,
  MIN_COMPLETION_PERCENTAGE,
  EARLY_EXIT_MULTIPLIER,
  type PomodoroSprintDuration,
} from './pomodoroSprintTypes';

/**
 * Calculate completion percentage based on duration and elapsed time
 * @param duration - selected duration in minutes
 * @param elapsedSeconds - elapsed time in seconds
 * @returns completion percentage (0-100)
 */
export function getCompletionPercentage(
  duration: PomodoroSprintDuration,
  elapsedSeconds: number
): number {
  const totalSeconds = duration * 60;
  const percentage = (elapsedSeconds / totalSeconds) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Calculate rewards based on completion percentage
 * @param duration - selected duration in minutes
 * @param elapsedSeconds - elapsed time in seconds
 * @returns rewards object with coins, dice, and tokens
 */
export function calculateRewards(
  duration: PomodoroSprintDuration,
  elapsedSeconds: number
): { coins: number; dice: number; tokens: number } {
  const completionPercentage = getCompletionPercentage(duration, elapsedSeconds);
  const baseRewards = POMODORO_SPRINT_REWARDS[duration];

  // Full completion (100%)
  if (completionPercentage >= 100) {
    return {
      coins: baseRewards.coins,
      dice: baseRewards.dice,
      tokens: baseRewards.tokens,
    };
  }

  // Early exit with minimum completion threshold
  if (completionPercentage >= MIN_COMPLETION_PERCENTAGE) {
    return {
      coins: Math.floor(baseRewards.coins * EARLY_EXIT_MULTIPLIER),
      dice: Math.floor(baseRewards.dice * EARLY_EXIT_MULTIPLIER),
      tokens: Math.floor(baseRewards.tokens * EARLY_EXIT_MULTIPLIER),
    };
  }

  // Below minimum threshold - no rewards
  return {
    coins: 0,
    dice: 0,
    tokens: 0,
  };
}

/**
 * Format remaining time as MM:SS
 * @param seconds - total seconds remaining
 * @returns formatted time string (e.g., "24:35")
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get total seconds for a duration
 * @param duration - duration in minutes
 * @returns total seconds
 */
export function getTotalSeconds(duration: PomodoroSprintDuration): number {
  return duration * 60;
}
