/**
 * Habit Adjustments Persistence Service
 * 
 * Provides functions to store and retrieve habit adjustment suggestions for auditing.
 * This service is optional - if the habit_adjustments table doesn't exist,
 * operations will gracefully no-op and return empty results.
 * 
 * See migration: supabase/migrations/0005_habit_adjustments.sql
 * 
 * NOTE: Since this table is optional and may not exist in the schema,
 * we use type assertions to bypass strict TypeScript checking.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import type { HabitSuggestion } from '../features/habits/suggestionsEngine';
import type { Json } from '../lib/database.types';

/**
 * Row type for habit_adjustments table.
 */
export interface HabitAdjustmentRow {
  id: string;
  habit_id: string;
  created_at: string;
  classification: string | null;
  suggested_action: string | null;
  rationale: string | null;
  old_schedule: Json | null;
  new_schedule: Json | null;
  old_target_num: number | null;
  new_target_num: number | null;
  applied: boolean;
}

/**
 * Saves a habit suggestion to the habit_adjustments table for auditing.
 * If the table doesn't exist, this function will gracefully no-op.
 * 
 * @param habitId - The habit ID the suggestion applies to
 * @param suggestion - The suggestion to persist
 * @param oldSchedule - The original schedule (optional, for change tracking)
 * @param oldTargetNum - The original target number (optional, for change tracking)
 * @returns Object with success boolean and optional error message
 */
export async function saveHabitSuggestion(
  habitId: string,
  suggestion: HabitSuggestion,
  oldSchedule?: Json,
  oldTargetNum?: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const insertPayload = {
      habit_id: habitId,
      classification: suggestion.classification,
      suggested_action: suggestion.suggestedAction,
      rationale: suggestion.rationale,
      old_schedule: oldSchedule ?? null,
      new_schedule: suggestion.previewChange?.schedule 
        ? (suggestion.previewChange.schedule as unknown as Json) 
        : null,
      old_target_num: oldTargetNum ?? null,
      new_target_num: suggestion.previewChange?.target_num ?? null,
      applied: false,
    };

    // Use type assertion since habit_adjustments is an optional table
    // that may not exist in the generated database types
    const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<{ error: { code?: string; message: string } | null }> } })
      .from('habit_adjustments')
      .insert(insertPayload);

    if (error) {
      // Check if error is due to table not existing
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('habit_adjustments table not found. Skipping persistence.');
        return { success: true }; // Graceful no-op
      }
      console.error('Error saving habit suggestion:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    // Graceful handling for any unexpected errors
    console.error('Unexpected error in saveHabitSuggestion:', err);
    return { success: true }; // Graceful no-op
  }
}

/**
 * Retrieves recent pending (not applied) suggestions for a user's habits.
 * If the table doesn't exist, returns an empty array.
 * 
 * @param userId - The user ID to fetch suggestions for
 * @param limit - Maximum number of suggestions to return (default: 50)
 * @returns Array of habit adjustment rows
 */
export async function listPendingSuggestions(
  userId: string,
  limit: number = 50
): Promise<HabitAdjustmentRow[]> {
  try {
    const supabase = getSupabaseClient();
    
    // First get the user's habit IDs
    const { data: userHabits, error: habitsError } = await supabase
      .from('habits_v2')
      .select('id')
      .eq('user_id', userId)
      .eq('archived', false);

    if (habitsError) {
      console.error('Error fetching user habits:', habitsError);
      return [];
    }

    if (!userHabits || userHabits.length === 0) {
      return [];
    }

    const habitIds = userHabits.map(h => h.id);

    // Use type assertion since habit_adjustments is an optional table
    type QueryResult = { 
      data: HabitAdjustmentRow[] | null; 
      error: { code?: string; message: string } | null 
    };
    
    const { data, error } = await (supabase as unknown as { 
      from: (table: string) => { 
        select: (columns: string) => { 
          in: (column: string, values: string[]) => { 
            eq: (column: string, value: boolean) => { 
              order: (column: string, options: { ascending: boolean }) => { 
                limit: (count: number) => Promise<QueryResult> 
              } 
            } 
          } 
        } 
      } 
    })
      .from('habit_adjustments')
      .select('*')
      .in('habit_id', habitIds)
      .eq('applied', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Check if error is due to table not existing
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('habit_adjustments table not found. Returning empty list.');
        return [];
      }
      console.error('Error listing pending suggestions:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    // Graceful handling for any unexpected errors
    console.error('Unexpected error in listPendingSuggestions:', err);
    return [];
  }
}

/**
 * Marks a suggestion as applied.
 * If the table doesn't exist, returns success (graceful no-op).
 * 
 * @param suggestionId - The suggestion ID to mark as applied
 * @returns Object with success boolean and optional error message
 */
export async function markSuggestionApplied(
  suggestionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    // Use type assertion since habit_adjustments is an optional table
    const { error } = await (supabase as unknown as { 
      from: (table: string) => { 
        update: (data: { applied: boolean }) => { 
          eq: (column: string, value: string) => Promise<{ error: { code?: string; message: string } | null }> 
        } 
      } 
    })
      .from('habit_adjustments')
      .update({ applied: true })
      .eq('id', suggestionId);

    if (error) {
      // Check if error is due to table not existing
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('habit_adjustments table not found. Skipping update.');
        return { success: true }; // Graceful no-op
      }
      console.error('Error marking suggestion applied:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    // Graceful handling for any unexpected errors
    console.error('Unexpected error in markSuggestionApplied:', err);
    return { success: true }; // Graceful no-op
  }
}
