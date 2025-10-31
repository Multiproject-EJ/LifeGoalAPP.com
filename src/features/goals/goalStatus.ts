export type GoalStatusTag = 'on_track' | 'at_risk' | 'off_track' | 'achieved';

export const GOAL_STATUS_ORDER: GoalStatusTag[] = ['on_track', 'at_risk', 'off_track', 'achieved'];

export type GoalStatusMeta = {
  label: string;
  description: string;
  empty: string;
};

export const GOAL_STATUS_META: Record<GoalStatusTag, GoalStatusMeta> = {
  on_track: {
    label: 'On track',
    description: 'Progress is moving smoothly with no blockers.',
    empty: 'No goals have been marked on track yet.',
  },
  at_risk: {
    label: 'At risk',
    description: 'Momentum is slowing down and needs attention.',
    empty: 'No goals flagged at risk—keep monitoring your progress.',
  },
  off_track: {
    label: 'Off track',
    description: 'Major blockers or misses require a reset or new plan.',
    empty: 'No goals are off track right now.',
  },
  achieved: {
    label: 'Achieved',
    description: 'The goal has been completed—celebrate the win!',
    empty: 'Celebrate once goals start crossing the finish line.',
  },
};

export const GOAL_STATUS_OPTIONS = GOAL_STATUS_ORDER.map((value) => ({
  value,
  label: GOAL_STATUS_META[value].label,
  description: GOAL_STATUS_META[value].description,
}));

export const DEFAULT_GOAL_STATUS: GoalStatusTag = 'on_track';

export function normalizeGoalStatus(value: string | null | undefined): GoalStatusTag {
  if (!value) {
    return DEFAULT_GOAL_STATUS;
  }

  const normalized = value.toLowerCase().replace(/-/g, '_');

  if (normalized === 'blocked') {
    return 'off_track';
  }

  if (GOAL_STATUS_ORDER.includes(normalized as GoalStatusTag)) {
    return normalized as GoalStatusTag;
  }

  return DEFAULT_GOAL_STATUS;
}
