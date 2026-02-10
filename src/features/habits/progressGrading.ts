/**
 * Progress Grading Model for Habit Completions
 * 
 * Defines the four states of habit completion (done, done-ish, skipped, missed)
 * and their effects on streaks, XP, and auto-progression.
 */

/**
 * Progress state for a habit completion
 * - done: Fully completed the target
 * - doneIsh: Partially completed (e.g., 80% of target) - still meaningful progress
 * - skipped: Intentionally skipped (no penalty, doesn't break streak but no credit)
 * - missed: Unintentionally missed (breaks streak, no credit)
 */
export type ProgressState = 'done' | 'doneIsh' | 'skipped' | 'missed';

/**
 * Configuration for done-ish thresholds per habit type
 */
export type DoneIshConfig = {
  /** For boolean habits: whether "partial" mode is enabled */
  booleanPartialEnabled?: boolean;
  
  /** For quantity habits: percentage of target that counts as "done-ish" (0-100) */
  quantityThresholdPercent?: number;
  
  /** For duration habits: percentage of target that counts as "done-ish" (0-100) */
  durationThresholdPercent?: number;
  
  /** Alternative for duration: minimum minutes that count as "done-ish" */
  durationMinimumMinutes?: number;
};

/**
 * Default done-ish thresholds by habit type
 */
export const DEFAULT_DONEISH_CONFIG: DoneIshConfig = {
  booleanPartialEnabled: true,
  quantityThresholdPercent: 80,
  durationThresholdPercent: 80,
};

/**
 * Effects of each progress state on habit metrics
 */
export const PROGRESS_STATE_EFFECTS = {
  done: {
    streakCredit: 1.0,
    xpMultiplier: 1.0,
    autoProgressPoints: 1.0,
    breaksStreak: false,
  },
  doneIsh: {
    streakCredit: 0.7, // Partial credit - configurable weight
    xpMultiplier: 0.7,
    autoProgressPoints: 0.7,
    breaksStreak: false,
  },
  skipped: {
    streakCredit: 0,
    xpMultiplier: 0,
    autoProgressPoints: 0,
    breaksStreak: false, // Skipped doesn't break streak
  },
  missed: {
    streakCredit: 0,
    xpMultiplier: 0,
    autoProgressPoints: 0,
    breaksStreak: true, // Missed breaks the streak
  },
} as const;

/**
 * Calculate progress state based on completion percentage and done-ish config
 * 
 * @param habitType - Type of habit (boolean, quantity, duration)
 * @param completionPercent - Percentage of target completed (0-100)
 * @param wasSkipped - Whether the user marked it as skipped
 * @param config - Done-ish configuration for the habit
 * @returns The progress state
 */
export function calculateProgressState(
  habitType: 'boolean' | 'quantity' | 'duration',
  completionPercent: number,
  wasSkipped: boolean,
  config: DoneIshConfig = DEFAULT_DONEISH_CONFIG
): ProgressState {
  if (wasSkipped) {
    return 'skipped';
  }

  if (completionPercent >= 100) {
    return 'done';
  }

  // Check for done-ish thresholds
  if (habitType === 'boolean' && config.booleanPartialEnabled && completionPercent > 0) {
    return 'doneIsh';
  }

  if (habitType === 'quantity') {
    const threshold = config.quantityThresholdPercent ?? DEFAULT_DONEISH_CONFIG.quantityThresholdPercent ?? 80;
    if (completionPercent >= threshold) {
      return 'doneIsh';
    }
  }

  if (habitType === 'duration') {
    const threshold = config.durationThresholdPercent ?? DEFAULT_DONEISH_CONFIG.durationThresholdPercent ?? 80;
    if (completionPercent >= threshold) {
      return 'doneIsh';
    }
  }

  // If below threshold and not completed, it's missed
  return completionPercent > 0 ? 'missed' : 'missed';
}

/**
 * Calculate completion percentage for different habit types
 * 
 * @param habitType - Type of habit
 * @param value - Actual value logged (for quantity/duration)
 * @param target - Target value (for quantity/duration)
 * @param done - Boolean flag (for boolean type)
 * @returns Completion percentage (0-100)
 */
export function calculateCompletionPercentage(
  habitType: 'boolean' | 'quantity' | 'duration',
  value: number | null,
  target: number | null,
  done: boolean
): number {
  if (habitType === 'boolean') {
    return done ? 100 : 0;
  }

  if (!value || !target || target <= 0) {
    return 0;
  }

  const percent = (value / target) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * Get display label for progress state
 */
export function getProgressStateLabel(state: ProgressState): string {
  switch (state) {
    case 'done':
      return 'Done';
    case 'doneIsh':
      return 'Done-ish';
    case 'skipped':
      return 'Skipped';
    case 'missed':
      return 'Missed';
  }
}

/**
 * Get display color class for progress state
 */
export function getProgressStateColorClass(state: ProgressState): string {
  switch (state) {
    case 'done':
      return 'progress-done';
    case 'doneIsh':
      return 'progress-doneish';
    case 'skipped':
      return 'progress-skipped';
    case 'missed':
      return 'progress-missed';
  }
}

/**
 * Get emoji/icon for progress state
 */
export function getProgressStateIcon(state: ProgressState): string {
  switch (state) {
    case 'done':
      return '✅';
    case 'doneIsh':
      return '✨'; // Sparkles for "done-ish" 
    case 'skipped':
      return '⏭️';
    case 'missed':
      return '❌';
  }
}

/**
 * Helper to build habit log payload with progress state and completion percentage
 * 
 * @param habitType - Type of habit
 * @param target - Target value for quantity/duration habits
 * @param value - Actual value logged
 * @param done - Boolean flag for boolean habits
 * @param wasSkipped - Whether the user marked it as skipped
 * @param doneIshConfig - Done-ish configuration for the habit
 * @returns Payload with progress_state and completion_percentage
 */
export function buildHabitLogPayload(params: {
  habitType: 'boolean' | 'quantity' | 'duration';
  target: number | null;
  value: number | null;
  done: boolean;
  wasSkipped: boolean;
  doneIshConfig?: DoneIshConfig;
}): {
  done: boolean;
  value: number | null;
  progress_state: string;
  completion_percentage: number;
} {
  const { habitType, target, value, done, wasSkipped, doneIshConfig } = params;
  
  const completionPercent = calculateCompletionPercentage(habitType, value, target, done);
  const progressState = calculateProgressState(habitType, completionPercent, wasSkipped, doneIshConfig);
  
  return {
    done: progressState === 'done',
    value: value,
    progress_state: progressState,
    completion_percentage: Math.round(completionPercent),
  };
}
