export type ExperimentalFeatureKey =
  | 'aiCoachCompanion'
  | 'goalReflectionExperiments'
  | 'focusModeExtensions';

export type ExperimentalFeatureState = Record<ExperimentalFeatureKey, boolean>;

export type ExperimentalFeatureDefinition = {
  key: ExperimentalFeatureKey;
  title: string;
  description: string;
};

const STORAGE_PREFIX = 'lifegoal_experimental_features';

export const EXPERIMENTAL_FEATURES: ExperimentalFeatureDefinition[] = [
  {
    key: 'aiCoachCompanion',
    title: 'AI Coach Companion Insights',
    description: 'Surface coach-led next steps, deeper reflection prompts, and summary insights.',
  },
  {
    key: 'goalReflectionExperiments',
    title: 'Goal Reflection Experiments',
    description: 'Turn journal reflections into suggested weekly experiments and follow-ups.',
  },
  {
    key: 'focusModeExtensions',
    title: 'Focus Mode Extensions',
    description: 'Try new focus sessions, pacing options, and completion rituals.',
  },
];

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function getExperimentalFeatures(userId: string): ExperimentalFeatureState {
  const defaults = EXPERIMENTAL_FEATURES.reduce<ExperimentalFeatureState>((acc, feature) => {
    acc[feature.key] = false;
    return acc;
  }, {} as ExperimentalFeatureState);

  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) {
      return defaults;
    }

    const parsed = JSON.parse(stored) as Partial<ExperimentalFeatureState>;
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function saveExperimentalFeatures(userId: string, features: ExperimentalFeatureState): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(features));
  } catch {
    // Ignore storage errors
  }
}
