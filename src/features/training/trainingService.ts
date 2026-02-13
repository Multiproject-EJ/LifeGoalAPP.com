// Service layer for Training / Exercise feature - Supabase CRUD operations
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { ExerciseLog, TrainingStrategy } from './types';

/**
 * Helper to get untyped access to Supabase client for optional tables.
 * This allows querying tables that may not exist in the generated types.
 */
function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

/**
 * Fetch exercise logs for a user, optionally filtered by date range
 */
export async function fetchExerciseLogs(
  userId: string,
  dateRange?: { start: Date; end: Date }
): Promise<ExerciseLog[]> {
  let query = getUntypedSupabase()
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });

  if (dateRange) {
    query = query
      .gte('logged_at', dateRange.start.toISOString())
      .lte('logged_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching exercise logs:', error);
    throw error;
  }

  return (data as ExerciseLog[]) || [];
}

/**
 * Create a new exercise log
 */
export async function createExerciseLog(log: Omit<ExerciseLog, 'id'>): Promise<ExerciseLog> {
  const { data, error } = await getUntypedSupabase()
    .from('exercise_logs')
    .insert(log)
    .select()
    .single();

  if (error) {
    console.error('Error creating exercise log:', error);
    throw error;
  }

  return data as ExerciseLog;
}

/**
 * Delete an exercise log
 */
export async function deleteExerciseLog(id: string): Promise<void> {
  const { error } = await getUntypedSupabase().from('exercise_logs').delete().eq('id', id);

  if (error) {
    console.error('Error deleting exercise log:', error);
    throw error;
  }
}

/**
 * Fetch training strategies for a user
 */
export async function fetchStrategies(userId: string): Promise<TrainingStrategy[]> {
  const { data, error } = await getUntypedSupabase()
    .from('training_strategies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching training strategies:', error);
    throw error;
  }

  return (data as TrainingStrategy[]) || [];
}

/**
 * Create a new training strategy
 */
export async function createStrategy(
  strategy: Omit<TrainingStrategy, 'id'>
): Promise<TrainingStrategy> {
  const { data, error } = await getUntypedSupabase()
    .from('training_strategies')
    .insert(strategy)
    .select()
    .single();

  if (error) {
    console.error('Error creating training strategy:', error);
    throw error;
  }

  return data as TrainingStrategy;
}

/**
 * Update a training strategy
 */
export async function updateStrategy(
  id: string,
  updates: Partial<TrainingStrategy>
): Promise<TrainingStrategy> {
  const { data, error } = await getUntypedSupabase()
    .from('training_strategies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating training strategy:', error);
    throw error;
  }

  return data as TrainingStrategy;
}

/**
 * Delete a training strategy
 */
export async function deleteStrategy(id: string): Promise<void> {
  const { error } = await getUntypedSupabase().from('training_strategies').delete().eq('id', id);

  if (error) {
    console.error('Error deleting training strategy:', error);
    throw error;
  }
}

/**
 * Toggle strategy active state
 */
export async function toggleStrategyActive(
  id: string,
  isActive: boolean
): Promise<TrainingStrategy> {
  return updateStrategy(id, { is_active: isActive });
}
