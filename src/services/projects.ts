// Projects Service - CRUD operations for Projects feature
// Reference: ACTIONS_FEATURE_DEV_PLAN.md

import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import {
  DEMO_USER_ID,
  getDemoProjects,
  addDemoProject,
  updateDemoProject,
  removeDemoProject,
  getDemoProjectTasks,
  addDemoProjectTask,
  updateDemoProjectTask,
  removeDemoProjectTask,
} from './demoData';
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

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

// =====================================================
// PROJECTS CRUD OPERATIONS
// =====================================================

/**
 * Fetch all projects for the current user
 */
export async function fetchProjects(): Promise<ServiceResponse<Project[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoProjects(DEMO_USER_ID), error: null };
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
  status: ProjectStatus
): Promise<ServiceResponse<Project[]>> {
  if (!canUseSupabaseData()) {
    const allProjects = getDemoProjects(DEMO_USER_ID);
    const filtered = allProjects.filter((p) => p.status === status);
    return { data: filtered, error: null };
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
export async function fetchActiveProjects(): Promise<ServiceResponse<Project[]>> {
  if (!canUseSupabaseData()) {
    const allProjects = getDemoProjects(DEMO_USER_ID);
    const filtered = allProjects.filter(
      (p) => p.status !== 'archived' && p.status !== 'completed'
    );
    return { data: filtered, error: null };
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
export async function fetchProject(id: string): Promise<ServiceResponse<Project>> {
  if (!canUseSupabaseData()) {
    const allProjects = getDemoProjects(DEMO_USER_ID);
    const project = allProjects.find((p) => p.id === id) ?? null;
    return { data: project, error: null };
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
  if (!canUseSupabaseData()) {
    const newProject = addDemoProject(userId, input);
    return { data: newProject, error: null };
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
  input: UpdateProjectInput
): Promise<ServiceResponse<Project>> {
  if (!canUseSupabaseData()) {
    const updated = updateDemoProject(id, input);
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  
  // Handle status transitions
  const updatePayload: Record<string, unknown> = { ...input };
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
export async function completeProject(id: string): Promise<ServiceResponse<Project>> {
  return updateProject(id, { status: 'completed' });
}

/**
 * Archive a project
 */
export async function archiveProject(id: string): Promise<ServiceResponse<Project>> {
  return updateProject(id, { status: 'archived' });
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<ServiceResponse<Project>> {
  if (!canUseSupabaseData()) {
    const removed = removeDemoProject(id);
    return { data: removed, error: null };
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
  projectId: string
): Promise<ServiceResponse<ProjectTask[]>> {
  if (!canUseSupabaseData()) {
    const allTasks = getDemoProjectTasks(DEMO_USER_ID);
    const filtered = allTasks.filter((t) => t.project_id === projectId);
    return { data: filtered, error: null };
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
  status: TaskStatus
): Promise<ServiceResponse<ProjectTask[]>> {
  if (!canUseSupabaseData()) {
    const allTasks = getDemoProjectTasks(DEMO_USER_ID);
    const filtered = allTasks.filter(
      (t) => t.project_id === projectId && t.status === status
    );
    return { data: filtered, error: null };
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
      error: { 
        name: 'PostgrestError',
        message: 'project_id is required',
        details: '',
        hint: '',
        code: 'PGRST000'
      }
    };
  }

  if (!canUseSupabaseData()) {
    const newTask = addDemoProjectTask(userId, input);
    return { data: newTask, error: null };
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
  input: UpdateProjectTaskInput
): Promise<ServiceResponse<ProjectTask>> {
  if (!canUseSupabaseData()) {
    const updated = updateDemoProjectTask(id, input);
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  
  // Handle completion
  const updatePayload: Record<string, unknown> = { ...input };
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
  id: string
): Promise<ServiceResponse<ProjectTask>> {
  return updateProjectTask(id, { completed: true, status: 'done' });
}

/**
 * Delete a project task
 */
export async function deleteProjectTask(
  id: string
): Promise<ServiceResponse<ProjectTask>> {
  if (!canUseSupabaseData()) {
    const removed = removeDemoProjectTask(id);
    return { data: removed, error: null };
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
  tasks: Array<{ id: string; order_index: number }>
): Promise<{ success: boolean; error: PostgrestError | null }> {
  if (!canUseSupabaseData()) {
    for (const task of tasks) {
      updateDemoProjectTask(task.id, { order_index: task.order_index });
    }
    return { success: true, error: null };
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
