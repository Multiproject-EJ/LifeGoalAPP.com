// Actions Service - CRUD operations for Actions feature
// Reference: ACTIONS_FEATURE_DEV_PLAN.md

import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import {
  DEMO_USER_ID,
  getDemoActions,
  addDemoAction,
  updateDemoAction,
  removeDemoAction,
} from './demoData';
import type {
  Action,
  ActionCategory,
  CreateActionInput,
  UpdateActionInput,
} from '../types/actions';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

// =====================================================
// ACTIONS CRUD OPERATIONS
// =====================================================

/**
 * Fetch all actions for the current user
 */
export async function fetchActions(): Promise<ServiceResponse<Action[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoActions(DEMO_USER_ID), error: null };
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
  category: ActionCategory
): Promise<ServiceResponse<Action[]>> {
  if (!canUseSupabaseData()) {
    const allActions = getDemoActions(DEMO_USER_ID);
    const filtered = allActions.filter((a) => a.category === category);
    return { data: filtered, error: null };
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
export async function fetchActiveActions(): Promise<ServiceResponse<Action[]>> {
  if (!canUseSupabaseData()) {
    const allActions = getDemoActions(DEMO_USER_ID);
    const filtered = allActions.filter((a) => !a.completed);
    return { data: filtered, error: null };
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
 * Create a new action
 */
export async function insertAction(
  userId: string,
  input: CreateActionInput
): Promise<ServiceResponse<Action>> {
  if (!canUseSupabaseData()) {
    const newAction = addDemoAction(userId, input);
    return { data: newAction, error: null };
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
  input: UpdateActionInput
): Promise<ServiceResponse<Action>> {
  if (!canUseSupabaseData()) {
    const updated = updateDemoAction(id, input);
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  
  // If completing the action, set completed_at
  const updatePayload: Record<string, unknown> = { ...input };
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
 * Complete an action (shorthand for updateAction with completed=true)
 */
export async function completeAction(
  id: string,
  xpAwarded: number = 0
): Promise<ServiceResponse<Action>> {
  if (!canUseSupabaseData()) {
    const updated = updateDemoAction(id, {
      completed: true,
    });
    if (updated) {
      updated.completed_at = new Date().toISOString();
      updated.xp_awarded = xpAwarded;
    }
    return { data: updated, error: null };
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
export async function deleteAction(id: string): Promise<ServiceResponse<Action>> {
  if (!canUseSupabaseData()) {
    const removed = removeDemoAction(id);
    return { data: removed, error: null };
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
  actions: Array<{ id: string; order_index: number }>
): Promise<{ success: boolean; error: PostgrestError | null }> {
  if (!canUseSupabaseData()) {
    // Update demo actions order
    for (const action of actions) {
      updateDemoAction(action.id, { order_index: action.order_index });
    }
    return { success: true, error: null };
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
    const allActions = getDemoActions(DEMO_USER_ID);
    const now = new Date();
    const expired = allActions.filter((a) => {
      if (a.completed) return false;
      if (a.category === 'must_do') return false; // must_do never expires
      return new Date(a.expires_at) < now;
    });
    return { data: expired, error: null };
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
