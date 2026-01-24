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

export type ProfileStrengthResult = {
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

export type AreaSignalInput = {
  status?: 'ok' | 'no_data' | 'unavailable';
  coverage?: number;
  quality?: number;
  recencyDays?: number | null;
  needsReview?: boolean;
};

export type ProfileStrengthInput = {
  areas?: Partial<Record<AreaKey, AreaSignalInput | null>>;
  computedAt?: string;
};
