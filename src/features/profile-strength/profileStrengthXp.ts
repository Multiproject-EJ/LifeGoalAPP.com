import type { NextTask, ProfileStrengthResult } from './profileStrengthTypes';
import type { ProfileStrengthSignalSnapshot } from './profileStrengthData';

type ProfileStrengthXpBonusState = {
  goalsCoverage: boolean;
  habitsCoverage: boolean;
};

export type ProfileStrengthXpState = {
  completedTaskIds: string[];
  bonuses: ProfileStrengthXpBonusState;
};

export type ProfileStrengthXpEvent = {
  kind: 'task' | 'bonus';
  id: string;
  xp: number;
  sourceType: 'profile_strength_improvement' | 'profile_strength_bonus';
  sourceId: string;
  description: string;
};

const PROFILE_STRENGTH_XP_STORAGE_KEY = 'profileStrengthXpState';
const DEFAULT_XP_STATE: ProfileStrengthXpState = {
  completedTaskIds: [],
  bonuses: {
    goalsCoverage: false,
    habitsCoverage: false,
  },
};

const BONUS_DEFINITIONS = {
  goalsCoverage: {
    id: 'profile-strength-goals-coverage',
    xp: 100,
    description: 'Coverage bonus: all life wheel categories have at least one goal.',
  },
  habitsCoverage: {
    id: 'profile-strength-habits-coverage',
    xp: 250,
    description: 'Coverage bonus: each life wheel category has two or more habits.',
  },
} as const;

const getStorageKey = (userId?: string | null): string =>
  `${PROFILE_STRENGTH_XP_STORAGE_KEY}:${userId ?? 'demo'}`;

const normalizeXpState = (value: unknown): ProfileStrengthXpState => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_XP_STATE;
  }
  const record = value as ProfileStrengthXpState;
  return {
    completedTaskIds: Array.isArray(record.completedTaskIds) ? record.completedTaskIds : [],
    bonuses: {
      goalsCoverage: Boolean(record.bonuses?.goalsCoverage),
      habitsCoverage: Boolean(record.bonuses?.habitsCoverage),
    },
  };
};

export const loadProfileStrengthXpState = (userId?: string | null): ProfileStrengthXpState => {
  if (typeof window === 'undefined') {
    return DEFAULT_XP_STATE;
  }
  const stored = window.localStorage.getItem(getStorageKey(userId));
  if (!stored) {
    return DEFAULT_XP_STATE;
  }
  try {
    return normalizeXpState(JSON.parse(stored));
  } catch (error) {
    console.warn('Unable to parse profile strength XP state.', error);
    return DEFAULT_XP_STATE;
  }
};

export const saveProfileStrengthXpState = (
  userId: string,
  state: ProfileStrengthXpState,
): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
};

const getResolvedTasks = (
  previousSnapshot: ProfileStrengthResult,
  nextSnapshot: ProfileStrengthResult,
  nextSignals: ProfileStrengthSignalSnapshot,
): NextTask[] => {
  const completed: NextTask[] = [];

  for (const [area, tasks] of Object.entries(previousSnapshot.nextTasksByArea)) {
    const areaKey = area as NextTask['area'];
    const nextReasons = nextSnapshot.reasonsByArea[areaKey] ?? [];
    const nextStatus = nextSignals.areas?.[areaKey]?.status ?? 'unavailable';

    if (nextStatus !== 'ok') {
      continue;
    }

    for (const task of tasks ?? []) {
      const unresolved = task.reasonCodes.some((code) => nextReasons.includes(code));
      if (!unresolved) {
        completed.push(task);
      }
    }
  }

  return completed;
};

const hasFullGoalCoverage = (signals: ProfileStrengthSignalSnapshot): boolean => {
  const status = signals.areas?.goals?.status;
  if (status !== 'ok') {
    return false;
  }
  return Object.values(signals.metrics.goalCategoryCounts).every((count) => count >= 1);
};

const hasFullHabitCoverage = (signals: ProfileStrengthSignalSnapshot): boolean => {
  const status = signals.areas?.habits?.status;
  if (status !== 'ok') {
    return false;
  }
  return Object.values(signals.metrics.habitDomainCounts).every((count) => count >= 2);
};

export const buildProfileStrengthXpEvents = ({
  previousSnapshot,
  nextSnapshot,
  nextSignals,
  state,
}: {
  previousSnapshot: ProfileStrengthResult;
  nextSnapshot: ProfileStrengthResult;
  nextSignals: ProfileStrengthSignalSnapshot;
  state: ProfileStrengthXpState;
}): ProfileStrengthXpEvent[] => {
  const events: ProfileStrengthXpEvent[] = [];

  const resolvedTasks = getResolvedTasks(previousSnapshot, nextSnapshot, nextSignals);
  for (const task of resolvedTasks) {
    if (state.completedTaskIds.includes(task.id)) {
      continue;
    }
    events.push({
      kind: 'task',
      id: task.id,
      xp: task.xpReward,
      sourceType: 'profile_strength_improvement',
      sourceId: task.id,
      description: `Profile strength: ${task.title}`,
    });
  }

  if (!state.bonuses.goalsCoverage && hasFullGoalCoverage(nextSignals)) {
    events.push({
      kind: 'bonus',
      id: BONUS_DEFINITIONS.goalsCoverage.id,
      xp: BONUS_DEFINITIONS.goalsCoverage.xp,
      sourceType: 'profile_strength_bonus',
      sourceId: BONUS_DEFINITIONS.goalsCoverage.id,
      description: BONUS_DEFINITIONS.goalsCoverage.description,
    });
  }

  if (!state.bonuses.habitsCoverage && hasFullHabitCoverage(nextSignals)) {
    events.push({
      kind: 'bonus',
      id: BONUS_DEFINITIONS.habitsCoverage.id,
      xp: BONUS_DEFINITIONS.habitsCoverage.xp,
      sourceType: 'profile_strength_bonus',
      sourceId: BONUS_DEFINITIONS.habitsCoverage.id,
      description: BONUS_DEFINITIONS.habitsCoverage.description,
    });
  }

  return events;
};

export const applyProfileStrengthXpEvent = (
  state: ProfileStrengthXpState,
  event: ProfileStrengthXpEvent,
): ProfileStrengthXpState => {
  if (event.kind === 'task') {
    return {
      ...state,
      completedTaskIds: [...state.completedTaskIds, event.id],
    };
  }
  if (event.id === BONUS_DEFINITIONS.goalsCoverage.id) {
    return {
      ...state,
      bonuses: {
        ...state.bonuses,
        goalsCoverage: true,
      },
    };
  }
  if (event.id === BONUS_DEFINITIONS.habitsCoverage.id) {
    return {
      ...state,
      bonuses: {
        ...state.bonuses,
        habitsCoverage: true,
      },
    };
  }
  return state;
};
