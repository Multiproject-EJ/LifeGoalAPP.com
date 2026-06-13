import type { Database } from '../../lib/database.types';

type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];

export type GoalProgress = {
  completed: number;
  total: number;
  /** 0..1; 0 when there are no steps to measure. */
  ratio: number;
  /** True when the goal has at least one step to measure progress against. */
  measurable: boolean;
};

/** Progress for a single goal, derived from how many of its steps are complete. */
export function computeGoalProgress(steps: StepRow[] | undefined): GoalProgress {
  const list = steps ?? [];
  const total = list.length;
  const completed = list.filter((step) => step.completed).length;
  return {
    completed,
    total,
    ratio: total > 0 ? completed / total : 0,
    measurable: total > 0,
  };
}

/**
 * Average completion across a set of goals (each goal's step-completion ratio,
 * weighted equally). Only goals that have steps count toward the average, so an
 * area full of step-less goals reads as 0 rather than skewing the fill.
 */
export function computeAreaProgress(
  goalIds: string[],
  stepsByGoal: Record<string, StepRow[]>,
): number {
  const ratios = goalIds
    .map((goalId) => computeGoalProgress(stepsByGoal[goalId]))
    .filter((progress) => progress.measurable)
    .map((progress) => progress.ratio);
  if (ratios.length === 0) {
    return 0;
  }
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}
