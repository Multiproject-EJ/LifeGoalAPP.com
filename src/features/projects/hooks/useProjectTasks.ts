import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Action, ProjectTaskItem, CreateProjectTaskInput, UpdateProjectTaskInput, UpdateActionInput } from '../../../types/actions';
import { ACTIONS_XP_REWARDS } from '../../../types/actions';
import {
  fetchProjectTasks,
  insertProjectTask,
  updateProjectTask as updateProjectTaskService,
  deleteProjectTask,
  completeProjectTask,
} from '../../../services/projects';
import { fetchActionsByProjectId, updateAction, deleteAction, completeAction } from '../../../services/actions';
import { useGamification } from '../../../hooks/useGamification';
import { DEMO_USER_ID } from '../../../services/demoData';

export function useProjectTasks(session: Session | null, projectId: string) {
  const [tasks, setTasks] = useState<ProjectTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = session?.user?.id ?? DEMO_USER_ID;
  const { earnXP } = useGamification(session);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);

    const [{ data: taskData, error: taskError }, { data: actionData, error: actionError }] = await Promise.all([
      fetchProjectTasks(projectId),
      fetchActionsByProjectId(projectId),
    ]);

    if (taskError || actionError) {
      setError(taskError?.message ?? actionError?.message ?? 'Failed to load project tasks');
      setTasks([]);
    } else {
      const projectTasks = (taskData ?? []).map((task) => ({
        ...task,
        source: 'project_task' as const,
      }));
      const actionTasks = (actionData ?? []).map((action) => mapActionToTask(action, projectId));
      setTasks([...projectTasks, ...actionTasks]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = useCallback(async (input: CreateProjectTaskInput) => {
    const { data, error } = await insertProjectTask(userId, input);
    if (!error && data) {
      await loadTasks();
    }
    return { data, error };
  }, [userId, loadTasks]);

  const updateTask = useCallback(async (id: string, input: UpdateProjectTaskInput) => {
    const targetTask = tasks.find((task) => task.id === id);
    if (targetTask?.source === 'action') {
      const actionUpdate: UpdateActionInput = {};
      if (input.title) {
        actionUpdate.title = input.title;
      }
      if (typeof input.completed === 'boolean') {
        actionUpdate.completed = input.completed;
      } else if (input.status) {
        actionUpdate.completed = input.status === 'done';
      }
      if (!actionUpdate.title && typeof actionUpdate.completed !== 'boolean') {
        return { data: null, error: null };
      }

      const { data, error } = await updateAction(id, actionUpdate);
      if (!error && data) {
        await loadTasks();
      }
      return { data, error };
    }

    const { data, error } = await updateProjectTaskService(id, input);
    if (!error && data) {
      await loadTasks();
    }
    return { data, error };
  }, [loadTasks, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const targetTask = tasks.find((task) => task.id === id);
    if (targetTask?.source === 'action') {
      const { data, error } = await deleteAction(id);
      if (!error) {
        await loadTasks();
      }
      return { data, error };
    }

    const { data, error } = await deleteProjectTask(id);
    if (!error) {
      await loadTasks();
    }
    return { data, error };
  }, [loadTasks, tasks]);

  const completeTask = useCallback(async (id: string) => {
    const targetTask = tasks.find((task) => task.id === id);
    if (targetTask?.source === 'action') {
      const { data, error } = await completeAction(id, 0);
      if (!error && data) {
        await loadTasks();
      }
      return { data, error };
    }

    const { data, error } = await completeProjectTask(id);
    if (!error && data) {
      await loadTasks();
      earnXP(ACTIONS_XP_REWARDS.COMPLETE_PROJECT_TASK, 'project_task_completed', id);
    }
    return { data, error };
  }, [loadTasks, earnXP, tasks]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    refresh: loadTasks,
  };
}

function mapActionToTask(action: Action, projectId: string): ProjectTaskItem {
  return {
    id: action.id,
    project_id: action.project_id ?? projectId,
    user_id: action.user_id,
    title: action.title,
    description: action.notes ?? null,
    status: action.completed ? 'done' : 'todo',
    parent_task_id: null,
    depends_on_task_id: null,
    completed: action.completed,
    completed_at: action.completed_at,
    due_date: null,
    created_at: action.created_at,
    updated_at: action.completed_at ?? action.created_at,
    order_index: action.order_index,
    estimated_hours: null,
    actual_hours: null,
    source: 'action',
  };
}
