import type { Database } from '../../lib/database.types';
import { goalStatusToCompletionPct } from './goalStatus';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];

export type GoalCardIndicators = {
  strengthScore: number;
  strengthLabel: string;
  strengthStars: string;
  strengthChecklist: string[];
  missingStrengthSignals: string[];
  completionPct: number;
  completionLabel: string;
  completionSource: 'steps' | 'status';
  completedSteps: number;
  totalSteps: number;
};

const STRENGTH_SIGNALS = [
  { key: 'outcome', label: 'clear outcome' },
  { key: 'lifeArea', label: 'life area' },
  { key: 'targetDate', label: 'target date' },
  { key: 'actionPlan', label: 'action plan' },
  { key: 'progressNotes', label: 'progress notes' },
] as const;

export function computeGoalCardIndicators(goal: GoalRow, steps: StepRow[] = []): GoalCardIndicators {
  const completedSteps = steps.filter((step) => Boolean(step.completed_at)).length;
  const totalSteps = steps.length;
  const signals = new Set<string>();

  if (hasText(goal.title) && hasText(goal.description)) signals.add('outcome');
  if (hasText(goal.life_wheel_category)) signals.add('lifeArea');
  if (hasText(goal.target_date)) signals.add('targetDate');
  if (totalSteps > 0) signals.add('actionPlan');
  if (hasText(goal.progress_notes)) signals.add('progressNotes');

  const strengthScore = Math.min(5, signals.size);
  const missingStrengthSignals = STRENGTH_SIGNALS
    .filter((signal) => !signals.has(signal.key))
    .map((signal) => signal.label);
  const strengthChecklist = STRENGTH_SIGNALS
    .filter((signal) => signals.has(signal.key))
    .map((signal) => signal.label);

  const completionPct = totalSteps > 0
    ? Math.round((completedSteps / totalSteps) * 100)
    : goalStatusToCompletionPct(goal.status_tag);

  return {
    strengthScore,
    strengthLabel: getStrengthLabel(strengthScore),
    strengthStars: '★'.repeat(strengthScore) + '☆'.repeat(5 - strengthScore),
    strengthChecklist,
    missingStrengthSignals,
    completionPct,
    completionLabel: totalSteps > 0
      ? `${completedSteps}/${totalSteps} steps complete`
      : 'Estimated from status',
    completionSource: totalSteps > 0 ? 'steps' : 'status',
    completedSteps,
    totalSteps,
  };
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function getStrengthLabel(score: number): string {
  if (score >= 5) return 'Excellent';
  if (score >= 4) return 'Strong';
  if (score >= 3) return 'Building';
  if (score >= 2) return 'Needs detail';
  return 'Just started';
}
