import type { HabitV2Row } from '../../services/habitsV2';

/**
 * Schedule mode type matching the habits_v2.schedule JSON structure.
 */
type ScheduleMode = 'daily' | 'specific_days' | 'times_per_week' | 'every_n_days';

interface HabitSchedule {
  mode?: ScheduleMode;
  // TODO: Add support for specific days, times per week, every N days
  // days?: number[]; // For specific_days mode, 0-6 representing Sun-Sat
  // value?: number;  // For times_per_week or every_n_days modes
}

/**
 * Determines if a habit is scheduled to be tracked today based on its schedule configuration.
 * 
 * @param habit - The habit row from habits_v2
 * @param today - The reference date (defaults to current date)
 * @returns true if the habit should appear in today's checklist
 * 
 * TODO: Expand this function to support:
 * - specific_days mode (e.g., Mon/Wed/Fri only)
 * - times_per_week mode (e.g., 3 times per week, flexible)
 * - every_n_days mode (e.g., every 2 days)
 */
export function isHabitScheduledToday(habit: HabitV2Row, today: Date = new Date()): boolean {
  // Parse the schedule JSON
  const schedule = habit.schedule as HabitSchedule | null;
  
  if (!schedule || !schedule.mode) {
    // If no schedule mode is specified, default to showing the habit (backwards compatible)
    return true;
  }
  
  if (schedule.mode === 'daily') {
    return true;
  }
  
  // TODO: Implement specific_days mode
  // if (schedule.mode === 'specific_days' && schedule.days) {
  //   const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  //   return schedule.days.includes(dayOfWeek);
  // }
  
  // TODO: Implement times_per_week mode
  // This would require tracking completions this week
  
  // TODO: Implement every_n_days mode
  // This would require calculating days since start_date
  
  // For now, fallback to false for unimplemented modes
  // This is a safe default - habits with advanced schedules won't clutter the daily view
  return false;
}
