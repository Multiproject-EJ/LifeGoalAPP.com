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
import type { HabitSuggestion, HabitSchedule } from '../features/habits/suggestionsEngine';
import type { Json } from '../lib/database.types';
import type { HabitV2Row } from './habitsV2';

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
  applied_at: string | null;
  reverted: boolean;
  reverted_at: string | null;
  revert_rationale: string | null;
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
): Promise<{ success: boolean; error?: string; suggestionId?: string }> {
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

    const { data, error } = await supabase
      .from('habit_adjustments')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      if (isTableNotFoundError(error)) {
        console.warn('habit_adjustments table not found. Skipping persistence.');
        return { success: true }; // Graceful no-op for missing table
      }
      console.error('Error saving habit suggestion:', error);
      return { success: false, error: error.message };
    }

    return { success: true, suggestionId: data?.id };
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
      .update({ applied: true, applied_at: new Date().toISOString() })
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

/**
 * Apply a suggestion to a habit, updating the habit's schedule/target and marking the suggestion as applied.
 * 
 * This function:
 * 1. Fetches the suggestion by ID from habit_adjustments
 * 2. Fetches the current habit from habits_v2
 * 3. Validates that previewChange (new_schedule or new_target_num) exists
 * 4. Applies guardrails via clampScheduleChange
 * 5. Updates the habit in habits_v2
 * 6. Updates the suggestion row with applied=true, old_schedule, new_schedule, old_target_num, new_target_num
 * 7. Returns the updated habit
 * 
 * Note: This function only adjusts within the current schedule mode (no mode switches).
 * 
 * @param params - Object containing habitId, suggestionId, and userId
 * @returns Object with ok boolean, optional error message, and optional updated habit
 */
export async function applySuggestionForHabit(params: {
  habitId: string;
  suggestionId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string; updatedHabit?: HabitV2Row }> {
  const { habitId, suggestionId, userId } = params;
  
  try {
    // Dynamically import to avoid circular dependencies
    const { getHabitV2, updateHabitV2 } = await import('./habitsV2');
    const { clampScheduleChange, parseSchedule } = await import('../features/habits/suggestionsEngine');
    const { parseSchedule: parseScheduleInterpreter } = await import('../features/habits/scheduleInterpreter');
    
    // 1. Fetch the suggestion by ID
    const untypedSupabase = getUntypedSupabase();
    const { data: suggestion, error: suggestionError } = await untypedSupabase
      .from('habit_adjustments')
      .select('*')
      .eq('id', suggestionId)
      .single();
    
    if (suggestionError) {
      if (isTableNotFoundError(suggestionError)) {
        return { ok: false, error: 'Suggestion feature not available (table not found)' };
      }
      return { ok: false, error: suggestionError.message };
    }
    
    if (!suggestion) {
      return { ok: false, error: 'Suggestion not found' };
    }
    
    // Check if already applied
    if (suggestion.applied) {
      return { ok: false, error: 'Suggestion has already been applied' };
    }
    
    // Validate that the suggestion belongs to the specified habit
    if (suggestion.habit_id !== habitId) {
      return { ok: false, error: 'Suggestion does not belong to this habit' };
    }
    
    // 2. Fetch the current habit
    const { data: habit, error: habitError } = await getHabitV2(habitId);
    
    if (habitError) {
      return { ok: false, error: habitError.message };
    }
    
    if (!habit) {
      return { ok: false, error: 'Habit not found' };
    }
    
    // Validate user owns this habit
    if (habit.user_id !== userId) {
      return { ok: false, error: 'Not authorized to modify this habit' };
    }
    
    // 3. Validate previewChange exists (new_schedule or new_target_num)
    const hasNewSchedule = suggestion.new_schedule !== null;
    const hasNewTargetNum = suggestion.new_target_num !== null;
    
    if (!hasNewSchedule && !hasNewTargetNum) {
      return { ok: false, error: 'No changes to apply (previewChange not present)' };
    }
    
    // 4. Build preview from suggestion data and apply guardrails
    // Import the HabitSchedule type from suggestionsEngine
    type HabitScheduleType = NonNullable<ReturnType<typeof parseScheduleInterpreter>>;
    const preview: { schedule?: HabitScheduleType; target_num?: number } = {};
    
    if (hasNewSchedule && suggestion.new_schedule) {
      const parsedSchedule = parseScheduleInterpreter(suggestion.new_schedule);
      if (parsedSchedule) {
        preview.schedule = parsedSchedule;
      }
    }
    
    if (hasNewTargetNum) {
      preview.target_num = suggestion.new_target_num as number;
    }
    
    // Apply guardrails
    const clamped = clampScheduleChange(habit, preview);
    
    // 5. Prepare update payload
    const updatePayload: {
      schedule?: typeof habit.schedule;
      target_num?: number | null;
    } = {};
    
    if (clamped.schedule) {
      updatePayload.schedule = clamped.schedule as typeof habit.schedule;
    }
    
    if (clamped.target_num !== undefined) {
      updatePayload.target_num = clamped.target_num;
    }
    
    // 6. Update the habit in habits_v2
    const { data: updatedHabit, error: updateError } = await updateHabitV2(habitId, updatePayload);
    
    if (updateError) {
      return { ok: false, error: updateError.message };
    }
    
    if (!updatedHabit) {
      return { ok: false, error: 'Failed to update habit' };
    }
    
    // 7. Update the suggestion row with applied=true and before/after values
    const oldSchedule = habit.schedule;
    const oldTargetNum = habit.target_num;
    
    const { error: updateSuggestionError } = await untypedSupabase
      .from('habit_adjustments')
      .update({
        applied: true,
        applied_at: new Date().toISOString(),
        old_schedule: oldSchedule ?? null,
        // Use clamped value if available, otherwise fall back to suggestion's new_schedule
        // This ensures we record the actual value applied after guardrails
        new_schedule: clamped.schedule ?? suggestion.new_schedule ?? null,
        old_target_num: oldTargetNum ?? null,
        // Same fallback logic for target_num
        new_target_num: clamped.target_num ?? suggestion.new_target_num ?? null,
      })
      .eq('id', suggestionId);
    
    if (updateSuggestionError && !isTableNotFoundError(updateSuggestionError)) {
      console.error('Error updating suggestion applied status:', updateSuggestionError);
      // Don't fail the whole operation - the habit was updated successfully
    }
    
    return { ok: true, updatedHabit };
  } catch (err) {
    console.error('Unexpected error in applySuggestionForHabit:', err);
    return { ok: false, error: 'Unexpected error occurred while applying suggestion' };
  }
}

/**
 * Convenience function that saves a suggestion and applies it in one operation.
 * This is useful when suggestions are generated client-side and need to be persisted
 * before being applied.
 * 
 * @param params - Object containing habit, suggestion, and userId
 * @returns Object with ok boolean, optional error message, and optional updated habit
 */
export async function saveAndApplySuggestion(params: {
  habit: HabitV2Row;
  suggestion: HabitSuggestion;
  userId: string;
}): Promise<{ ok: boolean; error?: string; updatedHabit?: HabitV2Row }> {
  const { habit, suggestion, userId } = params;
  
  // First, save the suggestion to get an ID
  const saveResult = await saveHabitSuggestion(
    habit.id,
    suggestion,
    habit.schedule as Json,
    habit.target_num
  );
  
  if (!saveResult.success) {
    return { ok: false, error: saveResult.error ?? 'Failed to save suggestion' };
  }
  
  // If we didn't get an ID (table doesn't exist), we can still try to apply the changes directly
  if (!saveResult.suggestionId) {
    // Table doesn't exist - apply changes directly without suggestion tracking
    try {
      const { getHabitV2, updateHabitV2 } = await import('./habitsV2');
      const { clampScheduleChange } = await import('../features/habits/suggestionsEngine');
      
      // Build preview from suggestion - using explicit type for clarity
      const preview: { schedule?: HabitSchedule; target_num?: number } = {};
      
      if (suggestion.previewChange?.schedule) {
        preview.schedule = suggestion.previewChange.schedule;
      }
      
      if (suggestion.previewChange?.target_num !== undefined) {
        preview.target_num = suggestion.previewChange.target_num;
      }
      
      // No preview change to apply
      if (!preview.schedule && preview.target_num === undefined) {
        return { ok: false, error: 'No changes to apply' };
      }
      
      // Apply guardrails
      const clamped = clampScheduleChange(habit, preview);
      
      // Prepare update payload
      const updatePayload: {
        schedule?: typeof habit.schedule;
        target_num?: number | null;
      } = {};
      
      if (clamped.schedule) {
        updatePayload.schedule = clamped.schedule as typeof habit.schedule;
      }
      
      if (clamped.target_num !== undefined) {
        updatePayload.target_num = clamped.target_num;
      }
      
      // Update the habit
      const { data: updatedHabit, error: updateError } = await updateHabitV2(habit.id, updatePayload);
      
      if (updateError) {
        return { ok: false, error: updateError.message };
      }
      
      return { ok: true, updatedHabit: updatedHabit ?? undefined };
    } catch (err) {
      console.error('Error applying suggestion directly:', err);
      return { ok: false, error: 'Failed to apply suggestion' };
    }
  }
  
  // Apply the suggestion using the saved ID
  return applySuggestionForHabit({
    habitId: habit.id,
    suggestionId: saveResult.suggestionId,
    userId,
  });
}

/**
 * Revert a previously applied suggestion, restoring the habit's previous schedule/target values.
 * 
 * This function:
 * 1. Fetches the suggestion by ID from habit_adjustments
 * 2. Validates that it was applied and not yet reverted, and has old_* values
 * 3. Fetches the current habit from habits_v2
 * 4. Applies guardrails to old_* values via clampScheduleChange
 * 5. Updates the habit in habits_v2 with restored values
 * 6. Updates the suggestion row with reverted=true, reverted_at, revert_rationale, and backfills applied_at if needed
 * 7. Returns the updated habit
 * 
 * @param params - Object containing suggestionId, userId, and optional rationale
 * @returns Object with ok boolean, optional error message, and optional updated habit
 */
export async function revertSuggestionForHabit(params: {
  suggestionId: string;
  userId: string;
  rationale?: string;
}): Promise<{ ok: boolean; error?: string; updatedHabit?: HabitV2Row }> {
  const { suggestionId, userId, rationale } = params;
  
  try {
    // Dynamically import to avoid circular dependencies
    const { getHabitV2, updateHabitV2 } = await import('./habitsV2');
    const { clampScheduleChange } = await import('../features/habits/suggestionsEngine');
    const { parseSchedule: parseScheduleInterpreter } = await import('../features/habits/scheduleInterpreter');
    
    // 1. Fetch the suggestion by ID
    const untypedSupabase = getUntypedSupabase();
    const { data: suggestion, error: suggestionError } = await untypedSupabase
      .from('habit_adjustments')
      .select('*')
      .eq('id', suggestionId)
      .single();
    
    if (suggestionError) {
      if (isTableNotFoundError(suggestionError)) {
        return { ok: false, error: 'Revert feature not available (table not found)' };
      }
      return { ok: false, error: suggestionError.message };
    }
    
    if (!suggestion) {
      return { ok: false, error: 'Suggestion not found' };
    }
    
    // 2. Validate that the suggestion was applied and not yet reverted
    if (!suggestion.applied) {
      return { ok: false, error: 'Suggestion has not been applied yet' };
    }
    
    if (suggestion.reverted) {
      return { ok: false, error: 'Suggestion has already been reverted' };
    }
    
    // Validate old_* values are present for rollback
    const hasOldSchedule = suggestion.old_schedule !== null;
    const hasOldTargetNum = suggestion.old_target_num !== null;
    
    if (!hasOldSchedule && !hasOldTargetNum) {
      return { ok: false, error: 'No previous values to restore (old_schedule and old_target_num are both null)' };
    }
    
    // 3. Fetch the current habit
    const { data: habit, error: habitError } = await getHabitV2(suggestion.habit_id);
    
    if (habitError) {
      return { ok: false, error: habitError.message };
    }
    
    if (!habit) {
      return { ok: false, error: 'Habit not found' };
    }
    
    // Validate user owns this habit
    if (habit.user_id !== userId) {
      return { ok: false, error: 'Not authorized to modify this habit' };
    }
    
    // 4. Build restore payload from old_* fields and apply guardrails
    type HabitScheduleType = NonNullable<ReturnType<typeof parseScheduleInterpreter>>;
    const restorePreview: { schedule?: HabitScheduleType; target_num?: number } = {};
    
    if (hasOldSchedule && suggestion.old_schedule) {
      const parsedSchedule = parseScheduleInterpreter(suggestion.old_schedule);
      if (parsedSchedule) {
        restorePreview.schedule = parsedSchedule;
      }
    }
    
    if (hasOldTargetNum && typeof suggestion.old_target_num === 'number') {
      restorePreview.target_num = suggestion.old_target_num;
    }
    
    // Apply guardrails to ensure restored values are valid
    const clamped = clampScheduleChange(habit, restorePreview);
    
    // 5. Prepare update payload
    const updatePayload: {
      schedule?: typeof habit.schedule;
      target_num?: number | null;
    } = {};
    
    if (clamped.schedule) {
      updatePayload.schedule = clamped.schedule as typeof habit.schedule;
    }
    
    if (clamped.target_num !== undefined) {
      updatePayload.target_num = clamped.target_num;
    }
    
    // 6. Update the habit in habits_v2 with restored values
    const { data: updatedHabit, error: updateError } = await updateHabitV2(suggestion.habit_id, updatePayload);
    
    if (updateError) {
      return { ok: false, error: updateError.message };
    }
    
    if (!updatedHabit) {
      return { ok: false, error: 'Failed to update habit' };
    }
    
    // 7. Update the suggestion row with revert audit fields
    // Use COALESCE logic: backfill applied_at if it was null (for pre-migration rows)
    const now = new Date().toISOString();
    const { error: updateSuggestionError } = await untypedSupabase
      .from('habit_adjustments')
      .update({
        reverted: true,
        reverted_at: now,
        revert_rationale: rationale ?? null,
        // Backfill applied_at for pre-migration rows that were applied but didn't have this field
        applied_at: suggestion.applied_at ?? now,
      })
      .eq('id', suggestionId);
    
    if (updateSuggestionError && !isTableNotFoundError(updateSuggestionError)) {
      console.error('Error updating suggestion revert status:', updateSuggestionError);
      // Don't fail the whole operation - the habit was restored successfully
    }
    
    return { ok: true, updatedHabit };
  } catch (err) {
    console.error('Unexpected error in revertSuggestionForHabit:', err);
    return { ok: false, error: 'Unexpected error occurred while reverting suggestion' };
  }
}

/**
 * List applied suggestions for a user's habits that can be reverted.
 * Returns suggestions that have applied=true and reverted=false with old_* values present.
 * 
 * @param userId - The user ID to fetch suggestions for
 * @param limit - Maximum number of suggestions to return (default: 50)
 * @returns Array of habit adjustment rows eligible for revert
 */
export async function listRevertableSuggestions(
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
      .eq('applied', true)
      .eq('reverted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isTableNotFoundError(error)) {
        console.warn('habit_adjustments table not found. Returning empty list.');
        return [];
      }
      console.error('Error listing revertable suggestions:', error);
      return [];
    }

    // Filter to only include suggestions with old_* values
    const revertable = (data as HabitAdjustmentRow[])?.filter(
      s => s.old_schedule !== null || s.old_target_num !== null
    ) ?? [];
    
    return revertable;
  } catch (err) {
    console.error('Unexpected error in listRevertableSuggestions:', err);
    return [];
  }
}
