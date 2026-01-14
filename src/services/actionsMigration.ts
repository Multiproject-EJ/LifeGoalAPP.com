// src/services/actionsMigration.ts

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Action, Project, CreateProjectInput } from '../types/actions';
import { updateAction } from './actions';
import { insertProject } from './projects';
import { DEMO_USER_ID, updateDemoAction } from './demoData';

export interface MigrationResult {
  action: Action;
  project: Project | null;
  success: boolean;
  error?: string;
}

/**
 * Migrate a single PROJECT action to a full Project
 * 1. Creates a new Project with the action's title
 * 2. Updates the action with migrated_to_project_id
 * 3. Marks the action as completed
 */
export async function migrateActionToProject(action: Action): Promise<MigrationResult> {
  if (action.category !== 'project') {
    return {
      action,
      project: null,
      success: false,
      error: 'Only PROJECT category actions can be migrated',
    };
  }

  if (action.migrated_to_project_id) {
    return {
      action,
      project: null,
      success: false,
      error: 'Action has already been migrated',
    };
  }

  try {
    // 1. Create the project
    const projectInput: CreateProjectInput = {
      title: action.title,
      description: `Migrated from action: ${action.title}${action.notes ? `\n\nNotes: ${action.notes}` : ''}`,
      // Start as "planning" status
    };

    const { data: project, error: projectError } = await insertProject(action.user_id, projectInput);

    if (projectError || !project) {
      return {
        action,
        project: null,
        success: false,
        error: projectError?.message ?? 'Failed to create project',
      };
    }

    // 2. Update the action to link to the project and mark as completed
    const { error: updateError } = await updateAction(action.id, {
      completed: true,
      migrated_to_project_id: project.id,
    });

    if (updateError) {
      // Project was created but action update failed
      // This is a partial success - log it but don't fail completely
      console.warn('Action migration partial success: project created but action not updated', updateError);
    }

    return {
      action: { ...action, migrated_to_project_id: project.id, completed: true },
      project,
      success: true,
    };
  } catch (err) {
    return {
      action,
      project: null,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during migration',
    };
  }
}

/**
 * Migrate multiple PROJECT actions to Projects
 */
export async function migrateExpiredProjectActions(actions: Action[]): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  for (const action of actions) {
    const result = await migrateActionToProject(action);
    results.push(result);
  }

  return results;
}

/**
 * Run full migration for all expired PROJECT actions
 */
export async function runActionsMigration(): Promise<{
  results: MigrationResult[];
  successCount: number;
  failureCount: number;
}> {
  // Import here to avoid circular dependency
  const { getExpiredProjectActions } = await import('./actionsCleanup');
  
  const { data: expiredActions, error } = await getExpiredProjectActions();

  if (error || !expiredActions) {
    return { results: [], successCount: 0, failureCount: 0 };
  }

  const results = await migrateExpiredProjectActions(expiredActions);
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return { results, successCount, failureCount };
}
