export type DualPromptType =
  | 'life_wheel_orientation'
  | 'tiny_habit_adjustment'
  | 'habit_difficulty_rating'
  | 'blocker_check'
  | 'goal_link'
  | 'wisdom_reflection';

export type DualPromptAnswerFormat = 'yes_no' | 'choice' | 'rating' | 'compare' | 'text_optional';

export type DualPromptContext = 'inside_game' | 'outside_game';

export type DualPromptDestination =
  | 'habit_update'
  | 'goal_update'
  | 'life_wheel_checkin'
  | 'reflection'
  | 'profile_signal';

export interface DualPromptHistoryRecord {
  promptType: DualPromptType;
  shownAtMs: number;
  completedAtMs?: number | null;
  context: DualPromptContext;
}

export interface DualPromptPolicyInputs {
  habits: {
    hasAny: boolean;
    hasSuccessSignal: boolean;
    hasDifficultySignal: boolean;
  };
  goals: {
    hasAny: boolean;
  };
  checkins: {
    hasLifeWheelCheckin: boolean;
    isStale?: boolean;
  };
  profileSignals: {
    hasLifeAreaCoverage: boolean;
  };
  history: DualPromptHistoryRecord[];
  nowMs: number;
}

export interface DualPromptCandidate {
  type: DualPromptType;
  answerFormat: DualPromptAnswerFormat;
  context: DualPromptContext;
  destination: DualPromptDestination;
  priorityScore: number;
}

export type DualPromptNormalizedAnswer =
  | { kind: 'yes_no'; value: boolean }
  | { kind: 'choice'; value: string }
  | { kind: 'rating'; value: number }
  | { kind: 'compare'; value: { left: string; right: string; selected: 'left' | 'right' } }
  | { kind: 'text_optional'; value: string | null };

export interface DualPromptOutcomeResult {
  destination: DualPromptDestination;
  status: 'not_implemented';
  promptType: DualPromptType;
}

export type DualPromptCompletedCooldownsMs = Partial<Record<DualPromptType, number>>;
