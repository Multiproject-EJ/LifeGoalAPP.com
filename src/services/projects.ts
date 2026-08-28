// Projects Service - CRUD operations for Projects feature
// Reference: ACTIONS_FEATURE_DEV_PLAN.md

import { PostgrestError } from '@supabase/supabase-js';
import {
  canUseSupabaseData,
  canUseSupabaseDataForUser,
  getSupabaseClient,
} from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import type {
  Project,
  ProjectStatus,
  ProjectTask,
  TaskStatus,
  CreateProjectInput,
  UpdateProjectInput,
  CreateProjectTaskInput,
  UpdateProjectTaskInput,
} from '../types/actions';
import {
  addDemoProject,
  addDemoProjectTask,
  DEMO_USER_ID,
  getDemoProjects,
  getDemoProjectTasks,
  isDemoUserId,
  normalizeDemoUserId,
  removeDemoProject,
  removeDemoProjectTask,
  updateDemoProject,
  updateDemoProjectTask,
} from './demoData';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
type ProjectTaskUpdate = Database['public']['Tables']['project_tasks']['Update'];

function authRequiredError(): PostgrestError {
  return new PostgrestError({
    code: 'AUTH_REQUIRED',
    details: 'No active authenticated Supabase session.',
    hint: 'Sign in to access projects.',
    message: 'Authentication required.',
  });
}

function canUseCloudProjectData(userId?: string): boolean {
  return userId ? canUseSupabaseDataForUser(userId) : canUseSupabaseData();
}

function demoProjectsFor(userId: string): Project[] {
  return getDemoProjects(normalizeDemoUserId(userId));
}

function demoProjectTasksFor(userId: string): ProjectTask[] {
  return getDemoProjectTasks(normalizeDemoUserId(userId));
}

// =====================================================
// PROJECTS CRUD OPERATIONS
// =====================================================

/**
 * Fetch all projects for the current user
 */
export async function fetchProjects(userId?: string): Promise<ServiceResponse<Project[]>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoProjectsFor(userId), error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('projects')
    .select('*')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<Project[]>();
}

/**
 * Fetch projects by status
 */
export async function fetchProjectsByStatus(
  status: ProjectStatus,
  userId?: string,
): Promise<ServiceResponse<Project[]>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoProjectsFor(userId).filter((project) => project.status === status), error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('projects')
    .select('*')
    .eq('status', status)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<Project[]>();
}

/**
 * Fetch active projects (not archived or completed)
 */
export async function fetchActiveProjects(userId?: string): Promise<ServiceResponse<Project[]>> {
  if (userId && isDemoUserId(userId)) {
    return {
      data: demoProjectsFor(userId).filter((project) => !['archived', 'completed'].includes(project.status)),
      error: null,
    };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('projects')
    .select('*')
    .not('status', 'in', '("archived","completed")')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<Project[]>();
}

/**
 * Fetch a single project by ID
 */
export async function fetchProject(id: string, userId?: string): Promise<ServiceResponse<Project>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoProjectsFor(userId).find((project) => project.id === id) ?? null, error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .returns<Project>()
    .single();
}

/**
 * Create a new project
 */
export async function insertProject(
  userId: string,
  input: CreateProjectInput
): Promise<ServiceResponse<Project>> {
  if (isDemoUserId(userId)) {
    return { data: addDemoProject(DEMO_USER_ID, input), error: null };
  }
  if (!canUseSupabaseDataForUser(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? null,
      goal_id: input.goal_id ?? null,
      start_date: input.start_date ?? null,
      target_date: input.target_date ?? null,
      color: input.color ?? '#6366f1',
      icon: input.icon ?? '📋',
    })
    .select()
    .returns<Project>()
    .single();
}

/**
 * Update an existing project
 */
export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  userId?: string,
): Promise<ServiceResponse<Project>> {
  if (userId && isDemoUserId(userId)) {
    return { data: updateDemoProject(id, input), error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  
  // Handle status transitions
  const updatePayload: ProjectUpdate = { ...input };
  if (input.status === 'completed') {
    updatePayload.completed_at = new Date().toISOString();
  } else if (input.status === 'archived') {
    updatePayload.archived_at = new Date().toISOString();
  }

  return supabase
    .from('projects')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .returns<Project>()
    .single();
}

/**
 * Complete a project
 */
export async function completeProject(id: string, userId?: string): Promise<ServiceResponse<Project>> {
  return updateProject(id, { status: 'completed' }, userId);
}

/**
 * Archive a project
 */
export async function archiveProject(id: string, userId?: string): Promise<ServiceResponse<Project>> {
  return updateProject(id, { status: 'archived' }, userId);
}

/**
 * Delete a project
 */
export async function deleteProject(id: string, userId?: string): Promise<ServiceResponse<Project>> {
  if (userId && isDemoUserId(userId)) {
    return { data: removeDemoProject(id), error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .select()
    .single();
}

// =====================================================
// PROJECT TASKS CRUD OPERATIONS
// =====================================================

/**
 * Fetch all tasks for a project
 */
export async function fetchProjectTasks(
  projectId: string,
  userId?: string,
): Promise<ServiceResponse<ProjectTask[]>> {
  if (userId && isDemoUserId(userId)) {
    return { data: demoProjectTasksFor(userId).filter((task) => task.project_id === projectId), error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<ProjectTask[]>();
}

/**
 * Fetch tasks by status
 */
export async function fetchProjectTasksByStatus(
  projectId: string,
  status: TaskStatus,
  userId?: string,
): Promise<ServiceResponse<ProjectTask[]>> {
  if (userId && isDemoUserId(userId)) {
    return {
      data: demoProjectTasksFor(userId).filter((task) => task.project_id === projectId && task.status === status),
      error: null,
    };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', status)
    .order('order_index', { ascending: true })
    .returns<ProjectTask[]>();
}

/**
 * Create a new project task
 */
export async function insertProjectTask(
  userId: string,
  input: CreateProjectTaskInput
): Promise<ServiceResponse<ProjectTask>> {
  if (!input.project_id) {
    return { 
      data: null, 
      error: new PostgrestError({
        message: 'project_id is required',
        details: '',
        hint: '',
        code: 'PGRST000'
      })
    };
  }

  if (isDemoUserId(userId)) {
    return { data: addDemoProjectTask(DEMO_USER_ID, input), error: null };
  }
  if (!canUseSupabaseDataForUser(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('project_tasks')
    .insert({
      project_id: input.project_id,
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      parent_task_id: input.parent_task_id ?? null,
      depends_on_task_id: input.depends_on_task_id ?? null,
      due_date: input.due_date ?? null,
      estimated_hours: input.estimated_hours ?? null,
      order_index: input.order_index ?? 0,
    })
    .select()
    .returns<ProjectTask>()
    .single();
}

/**
 * Update a project task
 */
export async function updateProjectTask(
  id: string,
  input: UpdateProjectTaskInput,
  userId?: string,
): Promise<ServiceResponse<ProjectTask>> {
  if (userId && isDemoUserId(userId)) {
    return { data: updateDemoProjectTask(id, input), error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  
  // Handle completion
  const updatePayload: ProjectTaskUpdate = { ...input };
  if (input.completed === true || input.status === 'done') {
    updatePayload.completed = true;
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.status = 'done';
  } else if (input.completed === false) {
    updatePayload.completed_at = null;
  }

  return supabase
    .from('project_tasks')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .returns<ProjectTask>()
    .single();
}

/**
 * Complete a project task
 */
export async function completeProjectTask(
  id: string,
  userId?: string,
): Promise<ServiceResponse<ProjectTask>> {
  return updateProjectTask(id, { completed: true, status: 'done' }, userId);
}

/**
 * Delete a project task
 */
export async function deleteProjectTask(
  id: string,
  userId?: string,
): Promise<ServiceResponse<ProjectTask>> {
  if (userId && isDemoUserId(userId)) {
    return { data: removeDemoProjectTask(id), error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('project_tasks')
    .delete()
    .eq('id', id)
    .select()
    .single();
}

/**
 * Reorder project tasks
 */
export async function reorderProjectTasks(
  tasks: Array<{ id: string; order_index: number }>,
  userId?: string,
): Promise<{ success: boolean; error: PostgrestError | null }> {
  if (userId && isDemoUserId(userId)) {
    for (const task of tasks) updateDemoProjectTask(task.id, { order_index: task.order_index });
    return { success: true, error: null };
  }
  if (!canUseCloudProjectData(userId)) {
    return { success: false, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  
  for (const task of tasks) {
    const { error } = await supabase
      .from('project_tasks')
      .update({ order_index: task.order_index })
      .eq('id', task.id);
    
    if (error) {
      return { success: false, error };
    }
  }

  return { success: true, error: null };
}
