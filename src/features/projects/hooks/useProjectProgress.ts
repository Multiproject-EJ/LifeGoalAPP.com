import { useMemo } from 'react';
import type { Project, ProjectTask } from '../../../types/actions';

export interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export function useProjectProgress(project: Project, tasks: ProjectTask[]): ProjectProgress {
  return useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    let daysUntilDue: number | null = null;
    let isOverdue = false;

    if (project.target_date && project.status !== 'completed') {
      const now = new Date();
      const targetDate = new Date(project.target_date);
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      daysUntilDue = diffDays;
      isOverdue = diffDays < 0;
    }

    return {
      completed,
      total,
      percentage,
      daysUntilDue,
      isOverdue,
    };
  }, [project, tasks]);
}
