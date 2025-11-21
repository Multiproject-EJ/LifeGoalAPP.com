import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  DEMO_USER_ID,
  getDemoHabitLogsForRange,
  getDemoHabitsForUser,
} from './demoData';

type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * Structure representing completion data for a single habit in a month.
 * Contains the habit ID, name, and completion percentage for the month.
 */
export type HabitMonthlyCompletion = {
  habitId: string;
  habitName: string;
  totalDays: number;
  completedDays: number;
  completionPercentage: number;
  goalTitle?: string | null;
};

/**
 * Structure representing the monthly completion summary for all habits.
 */
export type MonthlyHabitCompletions = {
  userId: string;
  year: number;
  month: number; // 1-12 (January = 1)
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  habits: HabitMonthlyCompletion[];
  overallCompletionPercentage: number;
};

/**
 * Helper function to get the first and last day of a given month.
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1 = January)
 * @returns Object with startDate and endDate as ISO strings (YYYY-MM-DD)
 */
export function getMonthBoundaries(year: number, month: number): { startDate: string; endDate: string } {
  // Create date for first day of month
  const firstDay = new Date(year, month - 1, 1);
  
  // Create date for last day of month (day 0 of next month = last day of current month)
  const lastDay = new Date(year, month, 0);
  
  // Format as ISO date strings (YYYY-MM-DD)
  const startDate = formatISODate(firstDay);
  const endDate = formatISODate(lastDay);
  
  return { startDate, endDate };
}

/**
 * Format a Date object as an ISO date string (YYYY-MM-DD).
 */
function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Main helper function to get habit completions for a specific month.
 * 
 * @param userId - The user's ID
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1 = January)
 * @returns Promise with monthly completion data or error
 * 
 * @example
 * ```typescript
 * const result = await getHabitCompletionsByMonth('user-123', 2025, 1);
 * if (result.data) {
 *   result.data.habits.forEach(habit => {
 *     console.log(`${habit.habitName}: ${habit.completionPercentage}%`);
 *   });
 * }
 * ```
 */
export async function getHabitCompletionsByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<ServiceResponse<MonthlyHabitCompletions>> {
  try {
    // Get month boundaries
    const { startDate, endDate } = getMonthBoundaries(year, month);
    
    // Check if we should use demo data or real Supabase data
    if (!canUseSupabaseData()) {
      return getHabitCompletionsByMonthDemo(userId, year, month, startDate, endDate);
    }
    
    const supabase = getSupabaseClient();
    
    // Fetch all habits for the user with their associated goals
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, goal_id, frequency, schedule, goal:goals(id, title, target_date)')
      .eq('goals.user_id', userId);
    
    if (habitsError) {
      return { data: null, error: habitsError };
    }
    
    if (!habitsData || habitsData.length === 0) {
      return {
        data: {
          userId,
          year,
          month,
          startDate,
          endDate,
          habits: [],
          overallCompletionPercentage: 0,
        },
        error: null,
      };
    }
    
    // Type the habits properly
    type HabitWithGoal = {
      id: string;
      name: string;
      goal_id: string;
      frequency: string;
      schedule: any;
      goal: {
        id: string;
        title: string;
        target_date: string | null;
      } | null;
    };
    
    const habits = habitsData as unknown as HabitWithGoal[];
    
    // Get habit IDs
    const habitIds = habits.map(h => h.id);
    
    // Fetch all habit logs for these habits within the month range
    const { data: logsData, error: logsError } = await supabase
      .from('habit_logs')
      .select('*')
      .in('habit_id', habitIds)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (logsError) {
      return { data: null, error: logsError };
    }
    
    const logs = (logsData || []) as HabitLogRow[];
    
    // Calculate days in month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const totalDaysInMonth = monthEnd.getDate();
    
    // Build completion data for each habit
    const habitCompletions: HabitMonthlyCompletion[] = habits.map(habit => {
      // Count completed logs for this habit
      const habitLogs = logs.filter(log => log.habit_id === habit.id && log.completed);
      const completedDays = habitLogs.length;
      
      // Calculate completion percentage (out of total days in month)
      const completionPercentage = totalDaysInMonth > 0
        ? Math.round((completedDays / totalDaysInMonth) * 100)
        : 0;
      
      return {
        habitId: habit.id,
        habitName: habit.name,
        totalDays: totalDaysInMonth,
        completedDays,
        completionPercentage,
        goalTitle: habit.goal?.title || null,
      };
    });
    
    // Calculate overall completion percentage
    const totalPossibleCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.totalDays,
      0,
    );
    const totalActualCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.completedDays,
      0,
    );
    const overallCompletionPercentage = totalPossibleCompletions > 0
      ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100)
      : 0;
    
    return {
      data: {
        userId,
        year,
        month,
        startDate,
        endDate,
        habits: habitCompletions,
        overallCompletionPercentage,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getHabitCompletionsByMonth:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}

/**
 * Demo mode version of getHabitCompletionsByMonth.
 * Uses demo data instead of Supabase queries.
 */
function getHabitCompletionsByMonthDemo(
  userId: string,
  year: number,
  month: number,
  startDate: string,
  endDate: string,
): ServiceResponse<MonthlyHabitCompletions> {
  try {
    const effectiveUserId = userId || DEMO_USER_ID;
    
    // Get demo habits
    const habits = getDemoHabitsForUser(effectiveUserId);
    
    if (!habits || habits.length === 0) {
      return {
        data: {
          userId: effectiveUserId,
          year,
          month,
          startDate,
          endDate,
          habits: [],
          overallCompletionPercentage: 0,
        },
        error: null,
      };
    }
    
    // Get habit IDs
    const habitIds = habits.map(h => h.id);
    
    // Get demo logs for the date range
    const logs = getDemoHabitLogsForRange(habitIds, startDate, endDate);
    
    // Calculate days in month
    const monthEnd = new Date(year, month, 0);
    const totalDaysInMonth = monthEnd.getDate();
    
    // Build completion data for each habit
    const habitCompletions: HabitMonthlyCompletion[] = habits.map(habit => {
      // Count completed logs for this habit
      const habitLogs = logs.filter(log => log.habit_id === habit.id && log.completed);
      const completedDays = habitLogs.length;
      
      // Calculate completion percentage
      const completionPercentage = totalDaysInMonth > 0
        ? Math.round((completedDays / totalDaysInMonth) * 100)
        : 0;
      
      return {
        habitId: habit.id,
        habitName: habit.name,
        totalDays: totalDaysInMonth,
        completedDays,
        completionPercentage,
        goalTitle: null, // Demo data doesn't have goal associations in this context
      };
    });
    
    // Calculate overall completion percentage
    const totalPossibleCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.totalDays,
      0,
    );
    const totalActualCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.completedDays,
      0,
    );
    const overallCompletionPercentage = totalPossibleCompletions > 0
      ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100)
      : 0;
    
    return {
      data: {
        userId: effectiveUserId,
        year,
        month,
        startDate,
        endDate,
        habits: habitCompletions,
        overallCompletionPercentage,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getHabitCompletionsByMonthDemo:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}

/**
 * Helper function to get habit completions for a specific habit across multiple months.
 * Useful for showing trend data.
 * 
 * @param userId - The user's ID
 * @param habitId - The habit ID to track
 * @param startYear - Starting year
 * @param startMonth - Starting month (1-12)
 * @param endYear - Ending year
 * @param endMonth - Ending month (1-12)
 * @returns Promise with array of monthly completion data
 */
export async function getHabitCompletionsTrend(
  userId: string,
  habitId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): Promise<ServiceResponse<HabitMonthlyCompletion[]>> {
  try {
    const monthlyData: HabitMonthlyCompletion[] = [];
    
    // Iterate through each month in the range
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (
      currentYear < endYear ||
      (currentYear === endYear && currentMonth <= endMonth)
    ) {
      const result = await getHabitCompletionsByMonth(userId, currentYear, currentMonth);
      
      if (result.error) {
        return { data: null, error: result.error };
      }
      
      if (result.data) {
        const habitData = result.data.habits.find(h => h.habitId === habitId);
        if (habitData) {
          monthlyData.push(habitData);
        }
      }
      
      // Move to next month
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    
    return { data: monthlyData, error: null };
  } catch (error) {
    console.error('Error in getHabitCompletionsTrend:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}
