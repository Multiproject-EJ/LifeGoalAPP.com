export type GoalCoachExperimentVariant = 'control' | 'context_rich';

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isGoalCoachContextExperimentEnabled(): boolean {
  return envFlagEnabled(import.meta.env.VITE_GOAL_COACH_CONTEXT_EXPERIMENT);
}

export function resolveGoalCoachExperimentVariant(): GoalCoachExperimentVariant {
  return isGoalCoachContextExperimentEnabled() ? 'context_rich' : 'control';
}
