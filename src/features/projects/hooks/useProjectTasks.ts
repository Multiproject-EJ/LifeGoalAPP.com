import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProjectTask, CreateProjectTaskInput, UpdateProjectTaskInput } from '../../../types/actions';
import { ACTIONS_XP_REWARDS } from '../../../types/actions';
import {
  fetchProjectTasks,
  insertProjectTask,
  updateProjectTask as updateProjectTaskService,
  deleteProjectTask,
  completeProjectTask,
} from '../../../services/projects';
import { useGamification } from '../../../hooks/useGamification';
import { DEMO_USER_ID } from '../../../services/demoData';

export function useProjectTasks(session: Session | null, projectId: string) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = session?.user?.id ?? DEMO_USER_ID;
  const { earnXP } = useGamification(session);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchProjectTasks(projectId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTasks(data ?? []);
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
    const { data, error } = await updateProjectTaskService(id, input);
    if (!error && data) {
      await loadTasks();
    }
    return { data, error };
  }, [loadTasks]);

  const deleteTask = useCallback(async (id: string) => {
    const { data, error } = await deleteProjectTask(id);
    if (!error) {
      await loadTasks();
    }
    return { data, error };
  }, [loadTasks]);

  const completeTask = useCallback(async (id: string) => {
    const { data, error } = await completeProjectTask(id);
    if (!error && data) {
      await loadTasks();
      earnXP(ACTIONS_XP_REWARDS.COMPLETE_PROJECT_TASK, 'project_task_completed', id);
    }
    return { data, error };
  }, [loadTasks, earnXP]);

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
