/**
 * Performance Classifier Module
 * 
 * Provides lightweight, explainable classification of habit performance based on
 * adherence snapshots and streak data. Classifications drive suggestions for
 * easing, maintaining, or progressing habits.
 */

/**
 * Classification result indicating the habit's performance level.
 */
export type Classification = 'underperforming' | 'stable' | 'high' | 'observe';

/**
 * Suggested action based on classification.
 */
export type SuggestedAction = 'ease' | 'maintain' | 'progress' | 'observe';

/**
 * Parameters for classifying a habit's performance.
 */
export interface ClassifyHabitParams {
  /** 7-day adherence percentage (0-100) */
  adherence7: number;
  /** 30-day adherence percentage (0-100) */
  adherence30: number;
  /** Current consecutive completion streak in days */
  currentStreak: number;
  /** Previous streak length before the current one broke (optional) */
  previousStreak?: number;
  /** Minimum streak days required for progress suggestion (default: 14) */
  minProgressStreak?: number;
}

/**
 * Result of habit classification.
 */
export interface ClassificationResult {
  /** The performance classification */
  classification: Classification;
  /** Recommended action based on classification */
  suggestedAction: SuggestedAction;
  /** Human-readable explanation of why this classification was assigned */
  rationale: string;
}

/**
 * Classifies a habit's performance based on adherence and streak metrics.
 * 
 * Classification Rules:
 * - Underperforming: adherence7 < 45% OR (previousStreak >= 7 AND currentStreak == 0)
 * - High: adherence30 >= 85% AND currentStreak >= minProgressStreak (default 14)
 * - Stable: adherence7 between 45% and 80%
 * - Observe: all other cases (needs more data or borderline)
 * 
 * @param params - Classification parameters including adherence and streak data
 * @returns Classification result with classification, suggested action, and rationale
 */
export function classifyHabit(params: ClassifyHabitParams): ClassificationResult {
  const {
    adherence7,
    adherence30,
    currentStreak,
    previousStreak = 0,
    minProgressStreak = 14,
  } = params;

  // Rule 1: Underperforming
  // - Recent adherence is very low (< 45%)
  // - OR user had a significant streak that broke completely
  if (adherence7 < 45) {
    return {
      classification: 'underperforming',
      suggestedAction: 'ease',
      rationale: `7-day adherence is low at ${adherence7}%. Consider reducing frequency or targets to rebuild momentum.`,
    };
  }

  if (previousStreak >= 7 && currentStreak === 0) {
    return {
      classification: 'underperforming',
      suggestedAction: 'ease',
      rationale: `Previous streak of ${previousStreak} days was broken. Consider easing the habit to help restart.`,
    };
  }

  // Rule 2: High performer - ready to progress
  // - Strong 30-day adherence (>= 85%)
  // - Sustained current streak meeting minimum threshold
  if (adherence30 >= 85 && currentStreak >= minProgressStreak) {
    return {
      classification: 'high',
      suggestedAction: 'progress',
      rationale: `Excellent performance with ${adherence30}% adherence over 30 days and ${currentStreak}-day streak. Ready to level up!`,
    };
  }

  // Rule 3: Stable - maintain current settings
  // - Moderate 7-day adherence (45-80%)
  if (adherence7 >= 45 && adherence7 <= 80) {
    return {
      classification: 'stable',
      suggestedAction: 'maintain',
      rationale: `Good consistency at ${adherence7}% weekly adherence. Keep up the current pace.`,
    };
  }

  // Rule 4: Observe - borderline cases, need more data
  // - High weekly adherence but not meeting progress criteria
  // - Or other edge cases
  return {
    classification: 'observe',
    suggestedAction: 'observe',
    rationale: `Performance is ${adherence7}% weekly / ${adherence30}% monthly. Continue monitoring before making changes.`,
  };
}
