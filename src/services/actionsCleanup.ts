// src/services/actionsCleanup.ts

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Action } from '../types/actions';
import { DEMO_USER_ID, getDemoActions, removeDemoAction } from './demoData';

/**
 * Fetch all expired actions for the current user
 * Expired = expires_at < now AND completed = false
 */
export async function fetchExpiredActions(): Promise<{ data: Action[] | null; error: Error | null }> {
  if (!canUseSupabaseData()) {
    const allActions = getDemoActions(DEMO_USER_ID);
    const now = new Date();
    const expired = allActions.filter(
      (a) => !a.completed && new Date(a.expires_at) < now && a.category !== 'must_do'
    );
    return { data: expired, error: null };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('completed', false)
      .neq('category', 'must_do')
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    return { data: data as Action[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch expired actions') };
  }
}

/**
 * Delete all expired NICE TO DO actions
 * Returns the count of deleted actions
 */
export async function deleteExpiredNiceToDoActions(): Promise<{ count: number; error: Error | null }> {
  if (!canUseSupabaseData()) {
    const allActions = getDemoActions(DEMO_USER_ID);
    const now = new Date();
    let count = 0;
    
    for (const action of allActions) {
      if (
        action.category === 'nice_to_do' &&
        !action.completed &&
        new Date(action.expires_at) < now
      ) {
        removeDemoAction(action.id);
        count++;
      }
    }
    
    return { count, error: null };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('actions')
      .delete()
      .eq('category', 'nice_to_do')
      .eq('completed', false)
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) throw error;
    return { count: data?.length ?? 0, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err : new Error('Failed to delete expired actions') };
  }
}

/**
 * Get expired PROJECT actions that need migration
 */
export async function getExpiredProjectActions(): Promise<{ data: Action[] | null; error: Error | null }> {
  if (!canUseSupabaseData()) {
    const allActions = getDemoActions(DEMO_USER_ID);
    const now = new Date();
    const expired = allActions.filter(
      (a) =>
        a.category === 'project' &&
        !a.completed &&
        !a.migrated_to_project_id &&
        new Date(a.expires_at) < now
    );
    return { data: expired, error: null };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('category', 'project')
      .eq('completed', false)
      .is('migrated_to_project_id', null)
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    return { data: data as Action[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to fetch expired project actions') };
  }
}

/**
 * Run full cleanup: delete expired NICE TO DO, return PROJECT actions to migrate
 */
export async function runActionsCleanup(): Promise<{
  deletedCount: number;
  actionsToMigrate: Action[];
  error: Error | null;
}> {
  const { count: deletedCount, error: deleteError } = await deleteExpiredNiceToDoActions();
  if (deleteError) {
    return { deletedCount: 0, actionsToMigrate: [], error: deleteError };
  }

  const { data: actionsToMigrate, error: fetchError } = await getExpiredProjectActions();
  if (fetchError) {
    return { deletedCount, actionsToMigrate: [], error: fetchError };
  }

  return { deletedCount, actionsToMigrate: actionsToMigrate ?? [], error: null };
}
