import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../../../types/actions';
import { ACTIONS_XP_REWARDS } from '../../../types/actions';
import {
  fetchProjects,
  insertProject,
  updateProject as updateProjectService,
  deleteProject as deleteProjectService,
  completeProject as completeProjectService,
} from '../../../services/projects';
import { useGamification } from '../../../hooks/useGamification';
import { DEMO_USER_ID } from '../../../services/demoData';

export function useProjects(session: Session | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = session?.user?.id ?? DEMO_USER_ID;
  const { earnXP } = useGamification(session);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchProjects();
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProjects(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = useCallback(async (input: CreateProjectInput) => {
    const { data, error } = await insertProject(userId, input);
    if (!error && data) {
      await loadProjects();
      earnXP(ACTIONS_XP_REWARDS.CREATE_PROJECT, 'project_created', data.id);
    }
    return { data, error };
  }, [userId, loadProjects, earnXP]);

  const updateProject = useCallback(async (id: string, input: UpdateProjectInput) => {
    const { data, error } = await updateProjectService(id, input);
    if (!error && data) {
      await loadProjects();
    }
    return { data, error };
  }, [loadProjects]);

  const deleteProject = useCallback(async (id: string) => {
    const { data, error } = await deleteProjectService(id);
    if (!error) {
      await loadProjects();
    }
    return { data, error };
  }, [loadProjects]);

  const completeProject = useCallback(async (id: string) => {
    const { data, error } = await completeProjectService(id);
    if (!error && data) {
      await loadProjects();
      earnXP(ACTIONS_XP_REWARDS.COMPLETE_PROJECT, 'project_completed', id);
      // Check for on-time bonus
      if (data.target_date && data.completed_at) {
        const targetDate = new Date(data.target_date);
        const completedDate = new Date(data.completed_at);
        if (completedDate <= targetDate) {
          earnXP(ACTIONS_XP_REWARDS.COMPLETE_PROJECT_ON_TIME, 'project_on_time', id);
        }
      }
    }
    return { data, error };
  }, [loadProjects, earnXP]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    completeProject,
    refresh: loadProjects,
  };
}
