export type AiCoachDataAccess = {
  goals: boolean;
  goalEvolution: boolean;
  habits: boolean;
  journaling: boolean;
  reflections: boolean;
  visionBoard: boolean;
};

export const DEFAULT_AI_COACH_ACCESS: AiCoachDataAccess = {
  goals: true,
  goalEvolution: true,
  habits: true,
  journaling: true,
  reflections: true,
  visionBoard: true,
};

export const AI_COACH_ACCESS_FIELDS: Array<{
  key: keyof AiCoachDataAccess;
  label: string;
  description: string;
}> = [
  {
    key: 'goals',
    label: 'Goals',
    description: 'Allow the coach to reference your goal titles, milestones, and progress notes.',
  },
  {
    key: 'goalEvolution',
    label: 'Goal evolution history',
    description: 'Allow the coach to read historical goal snapshots so it understands how your direction has evolved.',
  },
  {
    key: 'habits',
    label: 'Habits',
    description: 'Allow the coach to read habit streaks, schedules, and completion patterns.',
  },
  {
    key: 'journaling',
    label: 'Journaling',
    description: 'Allow the coach to read journal entries you have saved.',
  },
  {
    key: 'reflections',
    label: 'Reflections',
    description: 'Allow the coach to use your goal reflection notes.',
  },
  {
    key: 'visionBoard',
    label: 'Vision board',
    description: 'Allow the coach to reference vision board images and captions.',
  },
];

export function normalizeAiCoachAccess(
  value?: Partial<AiCoachDataAccess> | null,
): AiCoachDataAccess {
  return {
    goals: value?.goals ?? DEFAULT_AI_COACH_ACCESS.goals,
    habits: value?.habits ?? DEFAULT_AI_COACH_ACCESS.habits,
    goalEvolution: value?.goalEvolution ?? DEFAULT_AI_COACH_ACCESS.goalEvolution,
    journaling: value?.journaling ?? DEFAULT_AI_COACH_ACCESS.journaling,
    reflections: value?.reflections ?? DEFAULT_AI_COACH_ACCESS.reflections,
    visionBoard: value?.visionBoard ?? DEFAULT_AI_COACH_ACCESS.visionBoard,
  };
}
