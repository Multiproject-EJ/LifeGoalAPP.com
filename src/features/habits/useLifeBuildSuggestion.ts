import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { STARTER_HABIT_CATALOG } from './starterHabitCatalog';

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

export function getLifeBuildSuggestion(habits: LifeBuildHabitInput[]): LifeBuildSuggestion | null {
  const activeHabits = habits.filter((habit) => !habit.archived && (!habit.status || habit.status === 'active'));
  const activeDomainKeys = new Set(
    activeHabits
      .map((habit) => habit.domain_key)
      .filter(isStarterDomainKey),
  );

  // If existing active habits lack usable domain data, avoid a noisy generic setup prompt.
  if (activeHabits.length > 0 && activeDomainKeys.size === 0) {
    return null;
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
