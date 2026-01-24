export type AreaKey = 'goals' | 'habits' | 'journal' | 'vision_board' | 'life_wheel' | 'identity';

export type ReasonCode =
  | 'no_data'
  | 'low_coverage'
  | 'low_recency'
  | 'low_quality'
  | 'needs_review'
  | 'stale_snapshot'
  | 'error_fallback';

export type NextTask = {
  id: string;
  area: AreaKey;
  title: string;
  description: string;
  etaMinutes: 1 | 2 | 3 | 5;
  xpReward: number;
  reasonCodes: ReasonCode[];
  action: {
    type: 'navigate' | 'open_modal' | 'start_flow';
    target: string;
    payload?: Record<string, unknown>;
  };
};

export type ProfileStrengthDebugSnapshot = {
  areaScores: Record<AreaKey, number | null>;
  overallPercent: number | null;
  reasonsByArea: Record<AreaKey, ReasonCode[]>;
  nextTasksByArea: Record<AreaKey, NextTask[]>;
  globalNextTask: NextTask | null;
  meta: {
    computedAt: string;
    usedFallbackData: boolean;
  };
};

export const PROFILE_STRENGTH_DEBUG_STORAGE_KEY = 'profileStrengthDebug';

export const isProfileStrengthDebugEnabled = (): boolean => {
  if (!import.meta.env.DEV) {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(PROFILE_STRENGTH_DEBUG_STORAGE_KEY) === 'true';
};

export const getProfileStrengthDebugSnapshot = (): ProfileStrengthDebugSnapshot => {
  const fallbackTask: NextTask = {
    id: 'debug-goals-starter',
    area: 'goals',
    title: 'Add your first goal',
    description: 'Capture one meaningful goal to start building momentum.',
    etaMinutes: 2,
    xpReward: 25,
    reasonCodes: ['no_data'],
    action: {
      type: 'navigate',
      target: 'goals',
    },
  };

  return {
    areaScores: {
      goals: 0,
      habits: 0,
      journal: 0,
      vision_board: 0,
      life_wheel: 0,
      identity: 0,
    },
    overallPercent: 0,
    reasonsByArea: {
      goals: ['no_data'],
      habits: ['no_data'],
      journal: ['no_data'],
      vision_board: ['no_data'],
      life_wheel: ['no_data'],
      identity: ['no_data'],
    },
    nextTasksByArea: {
      goals: [fallbackTask],
      habits: [],
      journal: [],
      vision_board: [],
      life_wheel: [],
      identity: [],
    },
    globalNextTask: fallbackTask,
    meta: {
      computedAt: new Date().toISOString(),
      usedFallbackData: true,
    },
  };
};

export const logProfileStrengthDebugSnapshot = (snapshot: ProfileStrengthDebugSnapshot): void => {
  const summary = {
    overallPercent: snapshot.overallPercent,
    usedFallbackData: snapshot.meta.usedFallbackData,
    globalNextTask: snapshot.globalNextTask,
    areaScores: snapshot.areaScores,
    reasonsByArea: snapshot.reasonsByArea,
  };

  // eslint-disable-next-line no-console
  console.info('[ProfileStrength][debug]', summary);
};
