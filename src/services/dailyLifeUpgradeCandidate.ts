import { evaluateHabitDesign } from './habitDesignEngine';
import type { HabitDesignRecommendation } from './habitDesignSignals';

export interface DailyLifeUpgradeHabitInput {
  id: string;
  title: string;
  status?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
  paused_at?: string | null;
  linked_goal_id?: string | null;
  linkedGoalId?: string | null;
}

export interface DailyLifeUpgradeHabitLogInput {
  habit_id: string;
  completed?: boolean | null;
  skipped?: boolean | null;
}

export interface DailyLifeUpgradeSignalsInput {
  goalsLinkedByHabitId?: Record<string, string[] | null | undefined>;
  checkInAdherenceByHabitId?: Record<string, number | null | undefined>;
  environmentRiskTagsByHabitId?: Record<string, string[] | null | undefined>;
}

export interface DailyLifeUpgradeCandidateAlternative {
  suggestedHabitId: string;
  title: string;
  supportiveCopy: string;
}

export interface DailyLifeUpgradeCandidate {
  habitId: string;
  habitTitle: string;
  recommendationType: HabitDesignRecommendation;
  promptTitle: string;
  promptBody: string;
  suggestedActionLabel: string;
  alternatives: DailyLifeUpgradeCandidateAlternative[];
  priorityScore: number;
  reason: string;
}

type CandidatePriority =
  | 'shrink_to_tiny'
  | 'restart_gently'
  | 'add_environment_cue'
  | 'try_alternative_path'
  | 'link_to_goal'
  | 'upgrade_to_stretch'
  | 'celebrate_consistency';

const PRIORITY_BY_RECOMMENDATION: Record<CandidatePriority, number> = {
  shrink_to_tiny: 6,
  restart_gently: 5,
  add_environment_cue: 4,
  try_alternative_path: 3.5,
  link_to_goal: 3,
  upgrade_to_stretch: 2,
  celebrate_consistency: 1,
};

const PRESENTATION_BY_RECOMMENDATION: Record<CandidatePriority, { title: string; actionLabel: string }> = {
  shrink_to_tiny: { title: 'Choose your path', actionLabel: 'Short quest' },
  restart_gently: { title: 'Restart this habit gently', actionLabel: 'Start small restart' },
  add_environment_cue: { title: 'Add an environment cue', actionLabel: 'Add cue' },
  try_alternative_path: { title: 'Try a lighter path', actionLabel: 'Focus this habit' },
  link_to_goal: { title: 'Reconnect this habit to a goal', actionLabel: 'Link to goal' },
  upgrade_to_stretch: { title: 'Level this habit up', actionLabel: 'Upgrade to stretch' },
  celebrate_consistency: { title: 'Celebrate your consistency', actionLabel: 'Celebrate progress' },
};

function isHabitActive(habit: DailyLifeUpgradeHabitInput): boolean {
  if (habit.is_archived) return false;
  if (habit.archived_at) return false;
  if (habit.paused_at) return false;
  if (habit.status) {
    const normalized = habit.status.toLowerCase();
    if (normalized === 'archived' || normalized === 'paused' || normalized === 'deactivated') return false;
  }
  return true;
}

function toCandidatePriority(recommendation: HabitDesignRecommendation): CandidatePriority | null {
  if (recommendation in PRIORITY_BY_RECOMMENDATION) {
    return recommendation as CandidatePriority;
  }
  return null;
}

export function selectDailyLifeUpgradeCandidate(params: {
  habits: DailyLifeUpgradeHabitInput[];
  recentLogs: DailyLifeUpgradeHabitLogInput[];
  signals?: DailyLifeUpgradeSignalsInput;
}): DailyLifeUpgradeCandidate | null {
  const activeHabits = params.habits.filter(isHabitActive);
  if (activeHabits.length === 0) return null;

  const logsByHabitId = new Map<string, DailyLifeUpgradeHabitLogInput[]>();
  for (const log of params.recentLogs) {
    const list = logsByHabitId.get(log.habit_id) ?? [];
    list.push(log);
    logsByHabitId.set(log.habit_id, list);
  }

  const candidates: DailyLifeUpgradeCandidate[] = [];
  for (const habit of activeHabits) {
    const logs = logsByHabitId.get(habit.id) ?? [];
    const logsLast14 = logs.length;
    const completionCount = logs.filter((log) => log.completed === true).length;
    const skipCount = logs.filter((log) => log.skipped === true).length;
    const missesLast14 = Math.max(0, 14 - logsLast14);
    const completionRate = logsLast14 > 0 ? completionCount / logsLast14 : 0;
    const streakConsistency = Math.max(0, 1 - missesLast14 / 14);

    const linkedGoalId =
      habit.linkedGoalId ??
      habit.linked_goal_id ??
      (params.signals?.goalsLinkedByHabitId?.[habit.id]?.find((goalId): goalId is string => Boolean(goalId)) ?? null);

    const design = evaluateHabitDesign({
      completionRate,
      streakConsistency,
      missesLast14,
      skipsLast14: skipCount,
      logsLast14,
      timingAdherenceRate: params.signals?.checkInAdherenceByHabitId?.[habit.id] ?? undefined,
      environmentRiskTags:
        params.signals?.environmentRiskTagsByHabitId?.[habit.id]?.filter((tag): tag is string => Boolean(tag)) ?? undefined,
      linkedGoalId,
    });

    let recommendation = design.recommendation.recommendation;
    if (recommendation === 'link_to_goal' && linkedGoalId) {
      recommendation = 'celebrate_consistency';
    }

    const priorityKey = toCandidatePriority(recommendation);
    if (!priorityKey) continue;

    const presentation = PRESENTATION_BY_RECOMMENDATION[priorityKey];
    const priorityScore = PRIORITY_BY_RECOMMENDATION[priorityKey] * 1000 + Math.round(design.analysis.riskScore * 100);

    candidates.push({
      habitId: habit.id,
      habitTitle: habit.title,
      recommendationType: recommendation,
      promptTitle: presentation.title,
      promptBody: design.recommendation.promptPayload[0] ?? design.recommendation.reason,
      suggestedActionLabel: presentation.actionLabel,
      alternatives: (design.recommendation.alternatives ?? []).slice(0, 3),
      priorityScore,
      reason: design.recommendation.reason,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (a.habitTitle !== b.habitTitle) return a.habitTitle.localeCompare(b.habitTitle);
    return a.habitId.localeCompare(b.habitId);
  });

  return candidates[0] ?? null;
}
