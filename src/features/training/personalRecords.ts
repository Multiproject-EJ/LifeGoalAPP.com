// Personal Records Detection Logic
import type { ExerciseLog, PersonalRecord } from './types';

/**
 * Detects if a newly added exercise log sets a new personal record
 * @param newLog - The newly added exercise log
 * @param allLogs - All exercise logs for the user (excluding the new one)
 * @returns PersonalRecord if a new PR is detected, null otherwise
 */
export function detectPersonalRecord(
  newLog: ExerciseLog,
  allLogs: ExerciseLog[]
): PersonalRecord | null {
  // Filter logs for the same exercise
  const exerciseLogs = allLogs.filter(
    (log) => log.exercise_name.toLowerCase() === newLog.exercise_name.toLowerCase()
  );

  // Check for max weight PR
  if (newLog.weight_kg) {
    const previousMaxWeight = Math.max(
      0,
      ...exerciseLogs.map((log) => log.weight_kg || 0)
    );
    if (newLog.weight_kg > previousMaxWeight) {
      return {
        exercise_name: newLog.exercise_name,
        record_type: 'max_weight',
        value: newLog.weight_kg,
        previous_value: previousMaxWeight > 0 ? previousMaxWeight : null,
        achieved_at: newLog.logged_at,
      };
    }
  }

  // Check for max reps PR (total reps = reps × sets)
  // Note: This tracks total cumulative reps across all sets, not max reps in a single set
  if (newLog.reps && newLog.sets) {
    const newTotalReps = newLog.reps * newLog.sets;
    const previousMaxReps = Math.max(
      0,
      ...exerciseLogs.map((log) => (log.reps || 0) * (log.sets || 1))
    );
    if (newTotalReps > previousMaxReps) {
      return {
        exercise_name: newLog.exercise_name,
        record_type: 'max_reps',
        value: newTotalReps,
        previous_value: previousMaxReps > 0 ? previousMaxReps : null,
        achieved_at: newLog.logged_at,
      };
    }
  }

  // Check for max volume PR (volume = weight × reps × sets)
  if (newLog.weight_kg && newLog.reps && newLog.sets) {
    const newVolume = newLog.weight_kg * newLog.reps * newLog.sets;
    const previousMaxVolume = Math.max(
      0,
      ...exerciseLogs.map((log) =>
        (log.weight_kg || 0) * (log.reps || 0) * (log.sets || 1)
      )
    );
    if (newVolume > previousMaxVolume) {
      return {
        exercise_name: newLog.exercise_name,
        record_type: 'max_volume',
        value: newVolume,
        previous_value: previousMaxVolume > 0 ? previousMaxVolume : null,
        achieved_at: newLog.logged_at,
      };
    }
  }

  return null;
}
