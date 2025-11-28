/**
 * Suggestions Engine Module
 * 
 * Builds habit improvement suggestions based on classification results.
 * Generates preview changes for schedule and target adjustments without auto-applying.
 * 
 * TODO: Tune suggestion logic per habit type (boolean/quantity/duration).
 */

import type { HabitV2Row } from '../../services/habitsV2';
import type { HabitAdherenceSnapshot } from '../../services/adherenceMetrics';
import type { ClassificationResult, SuggestedAction } from './performanceClassifier';
import { parseSchedule, type HabitSchedule } from './scheduleInterpreter';

/**
 * Preview of potential schedule/target changes (not auto-applied).
 */
export interface PreviewChange {
  /** Modified schedule (if applicable) */
  schedule?: HabitSchedule;
  /** Modified target number (if applicable) */
  target_num?: number;
  /** Human-readable description of the change */
  changeDescription?: string;
}

/**
 * Complete suggestion for a single habit.
 */
export interface HabitSuggestion {
  /** The habit ID this suggestion applies to */
  habitId: string;
  /** The classification result */
  classification: string;
  /** The suggested action */
  suggestedAction: SuggestedAction;
  /** Human-readable explanation */
  rationale: string;
  /** Preview of potential changes (undefined for maintain/observe) */
  previewChange?: PreviewChange;
}

/**
 * Builds a suggestion for a habit based on its classification result.
 * 
 * Preview change examples:
 * - ease: reduce timesPerWeek by 1 (min 1) OR increase intervalDays by 1 OR lower target_num by 10%
 * - progress: increase timesPerWeek by 1 OR decrease intervalDays by 1 (min 1) OR raise target_num by ~10%
 * - maintain/observe: previewChange undefined
 * 
 * TODO: Add more nuanced suggestions per habit type (boolean/quantity/duration).
 * TODO: Consider habit history and user preferences for personalized suggestions.
 * 
 * @param habit - The habit row from habits_v2
 * @param classificationResult - Result from classifyHabit function
 * @param adherenceSnapshot - Adherence data for the habit
 * @returns A complete HabitSuggestion object
 */
export function buildSuggestion(
  habit: HabitV2Row,
  classificationResult: ClassificationResult,
  adherenceSnapshot: HabitAdherenceSnapshot
): HabitSuggestion {
  const { classification, suggestedAction, rationale } = classificationResult;
  
  const baseSuggestion: HabitSuggestion = {
    habitId: habit.id,
    classification,
    suggestedAction,
    rationale,
  };

  // Only build preview changes for ease and progress actions
  if (suggestedAction === 'maintain' || suggestedAction === 'observe') {
    return baseSuggestion;
  }

  const previewChange = buildPreviewChange(habit, suggestedAction);
  
  if (previewChange) {
    return {
      ...baseSuggestion,
      previewChange,
    };
  }

  return baseSuggestion;
}

/**
 * Builds a preview change based on the habit's current configuration and suggested action.
 * 
 * @param habit - The habit to generate preview change for
 * @param action - The suggested action (ease or progress)
 * @returns PreviewChange object or undefined if no change applicable
 */
function buildPreviewChange(
  habit: HabitV2Row,
  action: SuggestedAction
): PreviewChange | undefined {
  const schedule = parseSchedule(habit.schedule);
  
  // Try schedule-based changes first
  const scheduleChange = buildScheduleChange(schedule, action);
  if (scheduleChange) {
    return scheduleChange;
  }

  // Fall back to target-based changes for quantity/duration habits
  if ((habit.type === 'quantity' || habit.type === 'duration') && habit.target_num) {
    return buildTargetChange(habit.target_num, habit.type, action);
  }

  // No applicable change for this habit configuration
  return undefined;
}

/**
 * Builds schedule-based preview change.
 * 
 * TODO: Add support for specific_days mode adjustments.
 */
function buildScheduleChange(
  schedule: HabitSchedule | null,
  action: SuggestedAction
): PreviewChange | undefined {
  if (!schedule || !schedule.mode) {
    return undefined;
  }

  if (schedule.mode === 'times_per_week' && typeof schedule.timesPerWeek === 'number') {
    const currentTimes = schedule.timesPerWeek;
    
    if (action === 'ease') {
      // Reduce frequency by 1, minimum 1
      const newTimes = Math.max(1, currentTimes - 1);
      if (newTimes !== currentTimes) {
        return {
          schedule: { ...schedule, timesPerWeek: newTimes },
          changeDescription: `Reduce from ${currentTimes}x to ${newTimes}x per week`,
        };
      }
    } else if (action === 'progress') {
      // Increase frequency by 1
      const newTimes = currentTimes + 1;
      return {
        schedule: { ...schedule, timesPerWeek: newTimes },
        changeDescription: `Increase from ${currentTimes}x to ${newTimes}x per week`,
      };
    }
  }

  if (schedule.mode === 'every_n_days' && typeof schedule.intervalDays === 'number') {
    const currentInterval = schedule.intervalDays;
    
    if (action === 'ease') {
      // Increase interval by 1 (less frequent)
      const newInterval = currentInterval + 1;
      return {
        schedule: { ...schedule, intervalDays: newInterval },
        changeDescription: `Change from every ${currentInterval} days to every ${newInterval} days`,
      };
    } else if (action === 'progress') {
      // Decrease interval by 1 (more frequent), minimum 1
      const newInterval = Math.max(1, currentInterval - 1);
      if (newInterval !== currentInterval) {
        return {
          schedule: { ...schedule, intervalDays: newInterval },
          changeDescription: `Change from every ${currentInterval} days to every ${newInterval} days`,
        };
      }
    }
  }

  // TODO: Handle specific_days mode
  // Could suggest removing a day for ease, adding a day for progress

  return undefined;
}

/**
 * Builds target-based preview change for quantity/duration habits.
 * 
 * TODO: Consider different adjustment percentages based on habit type and history.
 */
function buildTargetChange(
  currentTarget: number,
  habitType: 'quantity' | 'duration',
  action: SuggestedAction
): PreviewChange | undefined {
  // Use 10% adjustment by default
  const adjustmentFactor = 0.10;
  
  if (action === 'ease') {
    // Reduce target by ~10%, minimum 1
    const newTarget = Math.max(1, Math.round(currentTarget * (1 - adjustmentFactor)));
    if (newTarget !== currentTarget) {
      const unit = habitType === 'duration' ? 'minutes' : 'units';
      return {
        target_num: newTarget,
        changeDescription: `Reduce target from ${currentTarget} to ${newTarget} ${unit}`,
      };
    }
  } else if (action === 'progress') {
    // Increase target by ~10%
    const newTarget = Math.round(currentTarget * (1 + adjustmentFactor));
    const unit = habitType === 'duration' ? 'minutes' : 'units';
    return {
      target_num: newTarget,
      changeDescription: `Increase target from ${currentTarget} to ${newTarget} ${unit}`,
    };
  }

  return undefined;
}

/**
 * Batch process multiple habits and generate suggestions for all.
 * 
 * @param habits - Array of habits to process
 * @param adherenceSnapshots - Map of habitId to adherence snapshot
 * @param streaks - Map of habitId to streak data
 * @param classifyFn - Classification function to use
 * @returns Record of habitId to HabitSuggestion
 */
export function buildAllSuggestions(
  habits: HabitV2Row[],
  adherenceSnapshots: HabitAdherenceSnapshot[],
  streaks: Map<string, { currentStreak: number; previousStreak?: number }>,
  classifyFn: (params: {
    adherence7: number;
    adherence30: number;
    currentStreak: number;
    previousStreak?: number;
  }) => ClassificationResult
): Record<string, HabitSuggestion> {
  const result: Record<string, HabitSuggestion> = {};

  for (const habit of habits) {
    const snapshot = adherenceSnapshots.find(s => s.habitId === habit.id);
    if (!snapshot) continue;

    const streakData = streaks.get(habit.id);
    
    const classificationResult = classifyFn({
      adherence7: snapshot.window7.percentage,
      adherence30: snapshot.window30.percentage,
      currentStreak: streakData?.currentStreak ?? 0,
      previousStreak: streakData?.previousStreak,
    });

    result[habit.id] = buildSuggestion(
      habit,
      classificationResult,
      snapshot
    );
  }

  return result;
}
