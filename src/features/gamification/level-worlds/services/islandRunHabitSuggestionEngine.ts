import type { SuggestedHabit } from '../../../habits/suggestedHabitLibrary';

export type HabitFeedbackEnergy = 'low' | 'medium' | 'high';
export type HabitFeedbackTime = 'under_2' | 'two_to_five' | 'over_five';
export type HabitFeedbackStyle = 'physical' | 'mental' | 'planning' | 'social';

export interface IslandRunHabitFeedbackProfile {
  energy: HabitFeedbackEnergy;
  time: HabitFeedbackTime;
  style: HabitFeedbackStyle;
}

const STYLE_KEYWORDS: Record<HabitFeedbackStyle, readonly string[]> = {
  physical: ['movement', 'mobility', 'hydration'],
  mental: ['calm', 'clarity', 'stress-relief', 'reflection'],
  planning: ['planning', 'focus', 'productivity', 'tracking'],
  social: ['connection', 'kindness', 'communication', 'gratitude'],
};

function scoreEnergyFit(habit: SuggestedHabit, energy: HabitFeedbackEnergy): number {
  if (energy === 'low') return habit.difficultyTier === 'tiny' ? 3 : habit.difficultyTier === 'easy' ? 1 : 0;
  if (energy === 'medium') return habit.difficultyTier === 'easy' ? 3 : 2;
  return habit.difficultyTier === 'medium' ? 3 : habit.difficultyTier === 'easy' ? 2 : 1;
}

function scoreTimeFit(habit: SuggestedHabit, time: HabitFeedbackTime): number {
  if (time === 'under_2') return habit.tinyVersion.includes('30 seconds') || habit.tinyVersion.includes('1 slow breath') ? 3 : 2;
  if (time === 'two_to_five') return habit.normalVersion.includes('2') || habit.normalVersion.includes('3') || habit.normalVersion.includes('5') ? 3 : 2;
  return habit.stretchVersion.length > habit.normalVersion.length ? 3 : 1;
}

function scoreStyleFit(habit: SuggestedHabit, style: HabitFeedbackStyle): number {
  const keys = STYLE_KEYWORDS[style];
  return habit.goalIntentTags.some((tag) => keys.includes(tag)) ? 3 : 1;
}

export function rankSuggestedHabitsByFeedback(habits: SuggestedHabit[], profile: IslandRunHabitFeedbackProfile): SuggestedHabit[] {
  return [...habits]
    .map((habit) => ({
      habit,
      score: scoreEnergyFit(habit, profile.energy) + scoreTimeFit(habit, profile.time) + scoreStyleFit(habit, profile.style),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.habit.suggestedHabitId.localeCompare(b.habit.suggestedHabitId);
    })
    .map((entry) => entry.habit);
}
