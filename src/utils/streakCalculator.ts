/**
 * Streak Calculator Utility
 * Handles streak calculation and validation
 */

// Constants
const MILLISECONDS_PER_DAY = 86400000;
const HOURS_PER_DAY = 24;

/**
 * Check if a streak is maintained (activity within last 24 hours)
 */
export function isStreakMaintained(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return false;
  
  const last = new Date(lastActivityDate);
  const now = new Date();
  const hoursSinceActivity = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  
  // Streak is maintained if activity was within 24 hours
  return hoursSinceActivity <= HOURS_PER_DAY;
}

/**
 * Check if activity was today
 */
export function isActivityToday(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return false;
  
  const last = new Date(lastActivityDate);
  const now = new Date();
  
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

/**
 * Check if activity was yesterday
 */
export function isActivityYesterday(lastActivityDate: string | null): boolean {
  if (!lastActivityDate) return false;
  
  const last = new Date(lastActivityDate);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    last.getFullYear() === yesterday.getFullYear() &&
    last.getMonth() === yesterday.getMonth() &&
    last.getDate() === yesterday.getDate()
  );
}

/**
 * Calculate streak from activity dates (sorted most recent first)
 */
export function calculateStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let checkDate = new Date(today);
  
  // Convert all dates to midnight for comparison
  const dates = activityDates.map((dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  
  // Sort dates descending (most recent first)
  dates.sort((a, b) => b.getTime() - a.getTime());
  
  for (const date of dates) {
    if (date.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (streak === 0 && date.getTime() === new Date(today.getTime() - MILLISECONDS_PER_DAY).getTime()) {
      // Allow streak to start from yesterday
      streak++;
      checkDate.setDate(checkDate.getDate() - 2);
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate longest streak from activity dates
 */
export function calculateLongestStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;
  
  // Convert all dates to midnight for comparison
  const dates = activityDates.map((dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  
  // Sort dates ascending
  dates.sort((a, b) => a.getTime() - b.getTime());
  
  let longestStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const currDate = dates[i];
    const dayDiff = (currDate.getTime() - prevDate.getTime()) / MILLISECONDS_PER_DAY;
    
    if (dayDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (dayDiff > 1) {
      currentStreak = 1;
    }
    // If dayDiff === 0, it's the same day, don't increment
  }
  
  return longestStreak;
}

/**
 * Get streak bonus multiplier based on streak length
 */
export function getStreakBonusMultiplier(streak: number): number {
  if (streak < 7) return 1.0;
  if (streak < 30) return 1.2;
  if (streak < 100) return 1.5;
  return 2.0;
}

/**
 * Check if streak milestone is reached
 */
export function checkStreakMilestone(
  oldStreak: number,
  newStreak: number,
): { milestone: number; reached: boolean } | null {
  const milestones = [7, 14, 30, 50, 100, 200, 365];
  
  for (const milestone of milestones) {
    if (oldStreak < milestone && newStreak >= milestone) {
      return { milestone, reached: true };
    }
  }
  
  return null;
}

/**
 * Get days until streak is lost (based on last activity)
 */
export function getDaysUntilStreakLost(lastActivityDate: string | null): number {
  if (!lastActivityDate) return 0;
  
  const last = new Date(lastActivityDate);
  const now = new Date();
  const hoursSinceActivity = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, HOURS_PER_DAY - hoursSinceActivity);
  
  return Math.ceil(hoursRemaining / HOURS_PER_DAY);
}

/**
 * Format streak display text
 */
export function formatStreakDisplay(streak: number): string {
  if (streak === 0) return 'No streak';
  if (streak === 1) return '1 day streak';
  return `${streak} day streak`;
}
