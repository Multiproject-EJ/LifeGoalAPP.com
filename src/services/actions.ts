// Actions Service - CRUD operations for Actions feature
// Reference: ACTIONS_FEATURE_DEV_PLAN.md

import { PostgrestError } from '@supabase/supabase-js';
import {
  canUseSupabaseData,
  canUseSupabaseDataForUser,
  getSupabaseClient,
} from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import type {
  Action,
  ActionCategory,
  CreateActionInput,
  UpdateActionInput,
} from '../types/actions';
import {
  addDemoAction,
  DEMO_USER_ID,
  getDemoActions,
  isDemoUserId,
  normalizeDemoUserId,
  removeDemoAction,
  updateDemoAction,
} from './demoData';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

type ActionUpdate = Database['public']['Tables']['actions']['Update'];

function authRequiredError(): PostgrestError {
  return new PostgrestError({
    code: 'AUTH_REQUIRED',
    details: 'No active authenticated Supabase session.',
    hint: 'Sign in to access actions.',
    message: 'Authentication required.',
  });
}

function canUseCloudActionData(userId?: string): boolean {
  return userId ? canUseSupabaseDataForUser(userId) : canUseSupabaseData();
}

function demoActionsFor(userId: string): Action[] {
  return getDemoActions(normalizeDemoUserId(userId));
}

// =====================================================
// ACTIONS CRUD OPERATIONS
// =====================================================

/**
 * Fetch all actions for the current user
 */
export async function fetchActions(userId?: string): Promise<ServiceResponse<Action[]>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoActionsFor(userId), error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .select('*')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<Action[]>();
}

/**
 * Fetch actions by category
 */
export async function fetchActionsByCategory(
  category: ActionCategory,
  userId?: string,
): Promise<ServiceResponse<Action[]>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoActionsFor(userId).filter((action) => action.category === category), error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .select('*')
    .eq('category', category)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<Action[]>();
}

/**
 * Fetch uncompleted actions only
 */
export async function fetchActiveActions(userId?: string): Promise<ServiceResponse<Action[]>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoActionsFor(userId).filter((action) => !action.completed), error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .select('*')
    .eq('completed', false)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<Action[]>();
}

/**
 * Fetch completed actions for a specific date (local day boundaries).
 */
export async function fetchCompletedActionsForDate(
  dateISO: string,
  userId?: string,
): Promise<ServiceResponse<Action[]>> {
  const startOfDay = new Date(`${dateISO}T00:00:00`);
  const endOfDay = new Date(`${dateISO}T23:59:59.999`);

  if (userId && isDemoUserId(userId)) {
    return {
      data: demoActionsFor(userId).filter((action) => {
        if (!action.completed || action.migrated_to_project_id || !action.completed_at) return false;
        const completedAt = new Date(action.completed_at);
        return completedAt >= startOfDay && completedAt <= endOfDay;
      }),
      error: null,
    };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .select('*')
    .eq('completed', true)
    .is('migrated_to_project_id', null)
    .gte('completed_at', startOfDay.toISOString())
    .lte('completed_at', endOfDay.toISOString())
    .order('completed_at', { ascending: false })
    .returns<Action[]>();
}

/**
 * Create a new action
 */
export async function insertAction(
  userId: string,
  input: CreateActionInput
): Promise<ServiceResponse<Action>> {
  if (isDemoUserId(userId)) {
    return { data: addDemoAction(DEMO_USER_ID, input), error: null };
  }
  if (!canUseSupabaseDataForUser(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  
  // Calculate expires_at: 3 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);

  return supabase
    .from('actions')
    .insert({
      user_id: userId,
      title: input.title,
      category: input.category,
      notes: input.notes ?? null,
      project_id: input.project_id ?? null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .returns<Action>()
    .single();
}

/**
 * Update an existing action
 */
export async function updateAction(
  id: string,
  input: UpdateActionInput,
  userId?: string,
): Promise<ServiceResponse<Action>> {
  if (userId && isDemoUserId(userId)) {
    return { data: updateDemoAction(id, input), error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  
  // If completing the action, set completed_at
  const updatePayload: ActionUpdate = { ...input };
  if (input.completed === true) {
    updatePayload.completed_at = new Date().toISOString();
  } else if (input.completed === false) {
    updatePayload.completed_at = null;
  }

  return supabase
    .from('actions')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .returns<Action>()
    .single();
}

/**
 * Fetch actions by project assignment
 */
export async function fetchActionsByProjectId(
  projectId: string,
  userId?: string,
): Promise<ServiceResponse<Action[]>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoActionsFor(userId).filter((action) => action.project_id === projectId), error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<Action[]>();
}

/**
 * Complete an action (shorthand for updateAction with completed=true)
 */
export async function completeAction(
  id: string,
  xpAwarded: number = 0,
  userId?: string,
): Promise<ServiceResponse<Action>> {
  if (userId && isDemoUserId(userId)) {
    return { data: updateDemoAction(id, { completed: true, xp_awarded: xpAwarded }), error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      xp_awarded: xpAwarded,
    })
    .eq('id', id)
    .select()
    .returns<Action>()
    .single();
}

/**
 * Delete an action
 */
export async function deleteAction(id: string, userId?: string): Promise<ServiceResponse<Action>> {
  if (userId && isDemoUserId(userId)) {
    return { data: removeDemoAction(id), error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .delete()
    .eq('id', id)
    .select()
    .single();
}

/**
 * Reorder actions within a category
 */
export async function reorderActions(
  actions: Array<{ id: string; order_index: number }>,
  userId?: string,
): Promise<{ success: boolean; error: PostgrestError | null }> {
  if (userId && isDemoUserId(userId)) {
    for (const action of actions) updateDemoAction(action.id, { order_index: action.order_index });
    return { success: true, error: null };
  }
  if (!canUseCloudActionData(userId)) {
    return { success: false, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  
  // Use a transaction-like approach by updating each action
  for (const action of actions) {
    const { error } = await supabase
      .from('actions')
      .update({ order_index: action.order_index })
      .eq('id', action.id);
    
    if (error) {
      return { success: false, error };
    }
  }

  return { success: true, error: null };
}

/**
 * Get expired actions that need cleanup (nice_to_do) or migration (project)
 * This is primarily for backend/cleanup jobs
 */
export async function fetchExpiredActions(): Promise<ServiceResponse<Action[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('actions')
    .select('*')
    .eq('completed', false)
    .neq('category', 'must_do')
    .lt('expires_at', new Date().toISOString())
    .returns<Action[]>();
}
