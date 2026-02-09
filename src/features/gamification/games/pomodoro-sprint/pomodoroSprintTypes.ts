/** Pomodoro Sprint duration options (in minutes) */
export type PomodoroSprintDuration = 5 | 10 | 15 | 25;

/** Pomodoro Sprint session state */
export interface PomodoroSprintSession {
  duration: PomodoroSprintDuration;  // selected duration in minutes
  startTime: string | null;          // ISO timestamp when timer started
  elapsedSeconds: number;            // total elapsed time in seconds
  isRunning: boolean;                // is timer currently running?
  isComplete: boolean;               // has session completed?
  rewards: {
    coins: number;
    dice: number;
    tokens: number;
  };
}

/** Reward tiers for Pomodoro Sprint durations */
export const POMODORO_SPRINT_REWARDS = {
  5: {
    coins: 10,
    dice: 0,
    tokens: 0,
  },
  10: {
    coins: 25,
    dice: 1,
    tokens: 0,
  },
  15: {
    coins: 40,
    dice: 1,
    tokens: 0,
  },
  25: {
    coins: 75,
    dice: 2,
    tokens: 1,
  },
} as const;

/** Minimum completion percentage to earn rewards (30%) */
export const MIN_COMPLETION_PERCENTAGE = 30;

/** Reward multiplier for early exit (50% of full rewards) */
export const EARLY_EXIT_MULTIPLIER = 0.5;
