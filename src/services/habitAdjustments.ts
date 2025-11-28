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
 * Checks if an error indicates the table doesn't exist.
 * Used for graceful no-op when the optional table hasn't been created.
 */
function isTableNotFoundError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || (error.message?.includes('does not exist') ?? false);
}

/**
 * Helper to get untyped access to Supabase client for optional tables.
 * This allows querying tables that may not exist in the generated types.
 */
function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
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
    const supabase = getUntypedSupabase();
    
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

    const { error } = await supabase
      .from('habit_adjustments')
      .insert(insertPayload);

    if (error) {
      if (isTableNotFoundError(error)) {
        console.warn('habit_adjustments table not found. Skipping persistence.');
        return { success: true }; // Graceful no-op for missing table
      }
      console.error('Error saving habit suggestion:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    // Unexpected errors should be logged and reported
    console.error('Unexpected error in saveHabitSuggestion:', err);
    return { success: false, error: 'Unexpected error occurred' };
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
    
    // First get the user's habit IDs (using typed query)
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

    // Query the optional table using untyped access
    const untypedSupabase = getUntypedSupabase();
    const { data, error } = await untypedSupabase
      .from('habit_adjustments')
      .select('*')
      .in('habit_id', habitIds)
      .eq('applied', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isTableNotFoundError(error)) {
        console.warn('habit_adjustments table not found. Returning empty list.');
        return [];
      }
      console.error('Error listing pending suggestions:', error);
      return [];
    }

    return (data as HabitAdjustmentRow[]) ?? [];
  } catch (err) {
    // Unexpected errors should be logged
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
    const supabase = getUntypedSupabase();
    
    const { error } = await supabase
      .from('habit_adjustments')
      .update({ applied: true })
      .eq('id', suggestionId);

    if (error) {
      if (isTableNotFoundError(error)) {
        console.warn('habit_adjustments table not found. Skipping update.');
        return { success: true }; // Graceful no-op for missing table
      }
      console.error('Error marking suggestion applied:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    // Unexpected errors should be logged and reported
    console.error('Unexpected error in markSuggestionApplied:', err);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
