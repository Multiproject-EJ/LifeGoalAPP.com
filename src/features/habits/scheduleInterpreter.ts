import type { HabitV2Row, HabitLogV2Row } from '../../services/habitsV2';

/**
 * Schedule mode type matching the habits_v2.schedule JSON structure.
 */
export type ScheduleMode = 'daily' | 'specific_days' | 'times_per_week' | 'every_n_days';

/**
 * Schedule JSON shape from habits_v2.schedule column.
 * {
 *   "mode": "daily" | "specific_days" | "times_per_week" | "every_n_days",
 *   "days"?: number[],         // For specific_days mode: 0=Sunday, 1=Monday...6=Saturday
 *   "timesPerWeek"?: number,   // For times_per_week mode
 *   "intervalDays"?: number,   // For every_n_days mode
 *   "startDate"?: "YYYY-MM-DD" // Baseline date for every_n_days mode
 * }
 */
export interface HabitSchedule {
  mode?: ScheduleMode;
  days?: number[];         // For specific_days mode: 0=Sunday, 1=Monday...6=Saturday
  timesPerWeek?: number;   // For times_per_week mode
  intervalDays?: number;   // For every_n_days mode
  startDate?: string;      // Baseline date for every_n_days mode (YYYY-MM-DD)
}

/**
 * Type guard to check if a value is a valid schedule mode.
 */
function isValidScheduleMode(mode: unknown): mode is ScheduleMode {
  return typeof mode === 'string' && 
    ['daily', 'specific_days', 'times_per_week', 'every_n_days'].includes(mode);
}

/**
 * Safely parse the schedule JSON and validate its structure.
 */
export function parseSchedule(schedule: unknown): HabitSchedule | null {
  if (!schedule || typeof schedule !== 'object') {
    return null;
  }
  
  const scheduleObj = schedule as Record<string, unknown>;
  
  if (scheduleObj.mode !== undefined && !isValidScheduleMode(scheduleObj.mode)) {
    return null;
  }
  
  return {
    mode: scheduleObj.mode as ScheduleMode | undefined,
    days: Array.isArray(scheduleObj.days) ? scheduleObj.days as number[] : undefined,
    timesPerWeek: typeof scheduleObj.timesPerWeek === 'number' ? scheduleObj.timesPerWeek : undefined,
    intervalDays: typeof scheduleObj.intervalDays === 'number' ? scheduleObj.intervalDays : undefined,
    startDate: typeof scheduleObj.startDate === 'string' ? scheduleObj.startDate : undefined,
  };
}

/**
 * Get the ISO week's Monday and Sunday dates for a given date.
 * ISO week starts on Monday.
 */
export function getISOWeekBounds(date: Date): { monday: Date; sunday: Date } {
  const d = new Date(date);
  const day = d.getDay();
  // Convert Sunday (0) to 7 for ISO week calculation
  const isoDay = day === 0 ? 7 : day;
  
  // Get Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - isoDay + 1);
  monday.setHours(0, 0, 0, 0);
  
  // Get Sunday
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
}

/**
 * Count how many days in a given array of day indices (0=Sun, 6=Sat) occur
 * between two dates (inclusive).
 */
function countScheduledDaysInRange(startDate: Date, endDate: Date, days: number[]): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (current <= end) {
    if (days.includes(current.getDay())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculate the number of completions needed for times_per_week habits
 * in the current week, and determine if the habit has met its weekly target.
 */
export function getTimesPerWeekProgress(
  schedule: HabitSchedule,
  weekLogs: HabitLogV2Row[]
): { completed: number; target: number; targetMet: boolean } {
  const target = schedule.timesPerWeek ?? 0;
  const completed = weekLogs.filter(log => log.done).length;
  return {
    completed,
    target,
    targetMet: completed >= target,
  };
}

/**
 * Calculate when an every_n_days habit is next due.
 * Returns the next due date or null if cannot be determined.
 */
export function getEveryNDaysNextDue(
  schedule: HabitSchedule,
  habitCreatedAt: string | null,
  today: Date = new Date()
): Date | null {
  const intervalDays = schedule.intervalDays;
  if (!intervalDays || intervalDays <= 0) {
    return null;
  }
  
  // Use startDate from schedule, or fall back to habit.created_at
  const baselineStr = schedule.startDate || habitCreatedAt;
  if (!baselineStr) {
    return null;
  }
  
  const baseline = new Date(baselineStr);
  baseline.setHours(0, 0, 0, 0);
  
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  
  // Calculate days since baseline
  const diffTime = todayMidnight.getTime() - baseline.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // If today is the baseline or a scheduled day
  if (diffDays >= 0 && diffDays % intervalDays === 0) {
    return todayMidnight;
  }
  
  // Calculate next due date
  const daysSinceLastDue = diffDays >= 0 ? diffDays % intervalDays : intervalDays + (diffDays % intervalDays);
  const daysUntilNext = intervalDays - daysSinceLastDue;
  
  const nextDue = new Date(todayMidnight);
  nextDue.setDate(nextDue.getDate() + daysUntilNext);
  
  return nextDue;
}

/**
 * Determines if a habit is scheduled to be tracked today based on its schedule configuration.
 * 
 * @param habit - The habit row from habits_v2
 * @param today - The reference date (defaults to current date)
 * @param weekLogs - Optional array of this habit's logs for the current week (needed for times_per_week mode)
 * @returns true if the habit should appear in today's checklist
 * 
 * Schedule modes:
 * - daily: Always returns true
 * - specific_days: Returns true if today's day of week is in the days array
 * - times_per_week: Returns true if weekly completions < timesPerWeek target
 * - every_n_days: Returns true if (daysSinceBaseline % intervalDays) === 0
 * 
 * TODO: Improved distribution logic for times_per_week (spread evenly across week)
 */
export function isHabitScheduledToday(
  habit: HabitV2Row,
  today: Date = new Date(),
  weekLogs: HabitLogV2Row[] = []
): boolean {
  // Safely parse and validate the schedule JSON
  const schedule = parseSchedule(habit.schedule);
  
  if (!schedule || !schedule.mode) {
    // If no valid schedule mode is specified, default to showing the habit (backwards compatible)
    return true;
  }
  
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  
  switch (schedule.mode) {
    case 'daily':
      return true;
      
    case 'specific_days': {
      if (!schedule.days || !Array.isArray(schedule.days)) {
        // No days specified, default to showing (backwards compatible)
        return true;
      }
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      return schedule.days.includes(dayOfWeek);
    }
    
    case 'times_per_week': {
      const timesPerWeek = schedule.timesPerWeek;
      if (typeof timesPerWeek !== 'number' || timesPerWeek <= 0) {
        // Invalid target, default to showing
        return true;
      }
      // Count completions this week
      const completionsThisWeek = weekLogs.filter(log => log.done).length;
      // Show in checklist if we haven't met the weekly target yet
      return completionsThisWeek < timesPerWeek;
    }
    
    case 'every_n_days': {
      const intervalDays = schedule.intervalDays;
      if (typeof intervalDays !== 'number' || intervalDays <= 0) {
        // Invalid interval, default to showing
        return true;
      }
      
      // Use startDate from schedule, or fall back to habit.created_at
      const baselineStr = schedule.startDate || habit.created_at;
      if (!baselineStr) {
        // No baseline date available, default to showing
        return true;
      }
      
      const baseline = new Date(baselineStr);
      baseline.setHours(0, 0, 0, 0);
      
      // Calculate days since baseline
      const diffTime = todayMidnight.getTime() - baseline.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // If today is before the baseline, don't show
      if (diffDays < 0) {
        return false;
      }
      
      // Show on scheduled days: baseline, baseline+interval, baseline+2*interval, etc.
      return diffDays % intervalDays === 0;
    }
    
    default:
      // Unknown mode, default to not showing to avoid clutter
      return false;
  }
}

/**
 * Get the scheduled count approximation for a habit within a date window.
 * Used for adherence calculations.
 * 
 * @param habit - The habit row
 * @param windowDays - Number of days in the window (e.g., 7 or 30)
 * @param endDate - The end date of the window (defaults to today)
 * @returns Approximate number of scheduled completions in the window
 * 
 * TODO: More precise scheduled counts accounting for startDate boundaries and partial weeks
 */
export function getScheduledCountForWindow(
  habit: HabitV2Row,
  windowDays: number,
  endDate: Date = new Date()
): number {
  const schedule = parseSchedule(habit.schedule);
  
  if (!schedule || !schedule.mode) {
    // Default to daily if no valid schedule
    return windowDays;
  }
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - windowDays + 1);
  startDate.setHours(0, 0, 0, 0);
  
  switch (schedule.mode) {
    case 'daily':
      return windowDays;
      
    case 'specific_days': {
      if (!schedule.days || !Array.isArray(schedule.days) || schedule.days.length === 0) {
        return windowDays; // Fallback to daily
      }
      return countScheduledDaysInRange(startDate, endDate, schedule.days);
    }
    
    case 'times_per_week': {
      const timesPerWeek = schedule.timesPerWeek;
      if (typeof timesPerWeek !== 'number' || timesPerWeek <= 0) {
        return windowDays; // Fallback to daily
      }
      // Approximate: timesPerWeek * (windowDays / 7)
      // Using floor for complete weeks to be conservative (not over-estimating)
      const weeks = Math.floor(windowDays / 7);
      const remainingDays = windowDays % 7;
      // For remaining days, estimate proportionally
      const remainingTarget = Math.round((remainingDays / 7) * timesPerWeek);
      return (weeks * timesPerWeek) + remainingTarget;
    }
    
    case 'every_n_days': {
      const intervalDays = schedule.intervalDays;
      if (typeof intervalDays !== 'number' || intervalDays <= 0) {
        return windowDays; // Fallback to daily
      }
      // Calculate occurrences: floor(windowDays / intervalDays) gives us the number of complete intervals
      // We add 1 only if there's at least one occurrence (the first day counts)
      // For a 30-day window with 7-day interval: floor(30/7) = 4, so 4-5 occurrences depending on alignment
      // Using ceil to be slightly more generous in expected scheduled count
      return Math.ceil(windowDays / intervalDays);
    }
    
    default:
      return windowDays;
  }
}
