import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { DEFAULT_STARTER_DOMAIN_KEY, STARTER_HABIT_CATALOG } from './starterHabitCatalog';

export type LifeBuildHabitInput = {
  domain_key?: string | null;
  archived?: boolean | null;
  status?: string | null;
};

export type LifeBuildSuggestion = {
  domainKey: LifeWheelCategoryKey;
  label: string;
  shortLabel: string;
};

const starterDomainKeyValues = new Set<string>(
  LIFE_WHEEL_CATEGORIES
    .filter((category) => (STARTER_HABIT_CATALOG[category.key]?.length ?? 0) > 0)
    .map((category) => category.key),
);

function isStarterDomainKey(value: string | null | undefined): value is LifeWheelCategoryKey {
  return typeof value === 'string' && starterDomainKeyValues.has(value);
}

function getCategorySuggestion(domainKey: LifeWheelCategoryKey): LifeBuildSuggestion | null {
  const category = LIFE_WHEEL_CATEGORIES.find((entry) => entry.key === domainKey);
  if (!category || !starterDomainKeyValues.has(category.key)) {
    return null;
  }

  return {
    domainKey: category.key,
    label: category.label,
    shortLabel: category.shortLabel,
  };
}

function getFallbackSuggestion(): LifeBuildSuggestion | null {
  const defaultSuggestion = getCategorySuggestion(DEFAULT_STARTER_DOMAIN_KEY);
  if (defaultSuggestion) {
    return defaultSuggestion;
  }

  const fallbackCategory = LIFE_WHEEL_CATEGORIES.find((category) => starterDomainKeyValues.has(category.key));
  return fallbackCategory ? getCategorySuggestion(fallbackCategory.key) : null;
}

export function getLifeBuildSuggestion(habits: LifeBuildHabitInput[]): LifeBuildSuggestion | null {
  const activeHabits = habits.filter((habit) => !habit.archived && (!habit.status || habit.status === 'active'));
  const activeDomainKeys = new Set(
    activeHabits
      .map((habit) => habit.domain_key)
      .filter(isStarterDomainKey),
  );

  if (activeHabits.length > 0 && activeDomainKeys.size === 0) {
    return getFallbackSuggestion();
  }

  const suggestedCategory = LIFE_WHEEL_CATEGORIES.find(
    (category) => starterDomainKeyValues.has(category.key) && !activeDomainKeys.has(category.key),
  );

  if (!suggestedCategory) {
    return null;
  }

  return {
    domainKey: suggestedCategory.key,
    label: suggestedCategory.label,
    shortLabel: suggestedCategory.shortLabel,
  };
}
