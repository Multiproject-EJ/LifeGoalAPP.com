/**
 * Adherence Metrics Module
 * 
 * Provides functions to calculate habit adherence snapshots for 7-day and 30-day windows.
 * These metrics are used to identify underperforming habits and provide improvement suggestions.
 * 
 * TODO: Future refinements:
 * - Account for startDate boundaries (don't count days before habit was created)
 * - More precise scheduled counts for partial weeks
 * - Underperformance classification & AI suggestions (later step)
 */

import type { HabitV2Row, HabitLogV2Row } from './habitsV2';
import { listHabitLogsForRangeMultiV2 } from './habitsV2';
import { getScheduledCountForWindow } from '../features/habits/scheduleInterpreter';

/**
 * Adherence data for a single time window (7d or 30d).
 */
export interface WindowAdherence {
  scheduledCount: number;
  completedCount: number;
  percentage: number; // 0-100
}

/**
 * Adherence snapshot for a single habit.
 */
export interface HabitAdherenceSnapshot {
  habitId: string;
  habitTitle: string;
  window7: WindowAdherence;
  window30: WindowAdherence;
}

/**
 * Format a date as YYYY-MM-DD string.
 */
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate adherence percentage, handling division by zero.
 */
function calcPercentage(completed: number, scheduled: number): number {
  if (scheduled <= 0) {
    return 0;
  }
  return Math.round((completed / scheduled) * 100);
}

/**
 * Build adherence snapshots for a list of habits.
 * Calculates approximate scheduled vs completed counts for 7-day and 30-day windows.
 * 
 * @param userId - The user ID to fetch logs for
 * @param habits - Array of habits to calculate adherence for
 * @param referenceDate - The end date for the windows (defaults to today)
 * @returns Promise with array of HabitAdherenceSnapshot
 * 
 * Adherence scheduled approximations by mode:
 * - daily: windowLength
 * - specific_days: count days in window matching schedule.days
 * - times_per_week: timesPerWeek * (windowDays/7) with proportional remainder
 * - every_n_days: floor(windowDays / intervalDays) + 1
 * 
 * TODO: Account for habit start_date to not count days before habit was created
 * TODO: More precise calculations for partial weeks and edge cases
 */
export async function buildAdherenceSnapshots(
  userId: string,
  habits: HabitV2Row[],
  referenceDate: Date = new Date(),
): Promise<HabitAdherenceSnapshot[]> {
  if (!habits || habits.length === 0) {
    return [];
  }

  const habitIds = habits.map(h => h.id);
  const today = new Date(referenceDate);
  today.setHours(23, 59, 59, 999);

  // Calculate date ranges
  const start7 = new Date(today);
  start7.setDate(start7.getDate() - 6);
  start7.setHours(0, 0, 0, 0);

  const start30 = new Date(today);
  start30.setDate(start30.getDate() - 29);
  start30.setHours(0, 0, 0, 0);

  // Fetch logs for the 30-day window (which includes the 7-day window)
  const { data: logs30, error } = await listHabitLogsForRangeMultiV2({
    userId,
    habitIds,
    startDate: formatDateISO(start30),
    endDate: formatDateISO(today),
  });

  if (error) {
    console.error('Error fetching logs for adherence metrics:', error);
    // Return empty snapshots on error rather than throwing
    return habits.map(habit => ({
      habitId: habit.id,
      habitTitle: habit.title,
      window7: { scheduledCount: 0, completedCount: 0, percentage: 0 },
      window30: { scheduledCount: 0, completedCount: 0, percentage: 0 },
    }));
  }

  const logsArray = logs30 ?? [];
  const start7Str = formatDateISO(start7);

  // Build snapshots for each habit
  return habits.map(habit => {
    // Filter logs for this habit
    const habitLogs = logsArray.filter(log => log.habit_id === habit.id && log.done);
    
    // Split into 7-day and 30-day windows
    const logs7 = habitLogs.filter(log => log.date >= start7Str);
    
    // Calculate scheduled counts
    const scheduled7 = getScheduledCountForWindow(habit, 7, today);
    const scheduled30 = getScheduledCountForWindow(habit, 30, today);
    
    // Calculate completed counts
    const completed7 = logs7.length;
    const completed30 = habitLogs.length;

    return {
      habitId: habit.id,
      habitTitle: habit.title,
      window7: {
        scheduledCount: scheduled7,
        completedCount: completed7,
        percentage: calcPercentage(completed7, scheduled7),
      },
      window30: {
        scheduledCount: scheduled30,
        completedCount: completed30,
        percentage: calcPercentage(completed30, scheduled30),
      },
    };
  });
}
