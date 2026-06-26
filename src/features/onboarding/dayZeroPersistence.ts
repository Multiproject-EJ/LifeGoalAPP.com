import type { Database } from '../../lib/database.types';
import { fetchGoals, insertGoal } from '../../services/goals';
import { listHabitsV2, quickAddDailyHabit } from '../../services/habitsV2';
import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';

type GoalRow = Database['public']['Tables']['goals']['Row'];

type DayZeroStarterInput = {
  userId: string;
  lifeArea: string;
  habit: string;
  reminder: string;
  reward: string;
};

export type DayZeroStarterPersistenceResult = {
  goalId: string | null;
  habitId: string | null;
  createdGoal: boolean;
  createdHabit: boolean;
};

const DAY_ZERO_SOURCE = 'day-zero-onboarding';

const LIFE_AREA_TO_CATEGORY: Record<string, LifeWheelCategoryKey> = {
  Health: 'health_fitness',
  Mind: 'spirituality_community',
  Relationships: 'love_relations',
  Work: 'career_development',
  Home: 'living_spaces',
  Growth: 'career_development',
};

export function getDayZeroLifeWheelCategory(lifeArea: string): LifeWheelCategoryKey | null {
  return LIFE_AREA_TO_CATEGORY[lifeArea] ?? null;
}

export function buildDayZeroStarterSeedKey(input: Pick<DayZeroStarterInput, 'lifeArea' | 'habit'>): string {
  return `${DAY_ZERO_SOURCE}:${normalizeForSeed(input.lifeArea)}:${normalizeForSeed(input.habit)}`;
}

export async function ensureDayZeroStarterRecords(
  input: DayZeroStarterInput,
): Promise<DayZeroStarterPersistenceResult> {
  const habitTitle = input.habit.trim();
  if (!habitTitle) {
    return { goalId: null, habitId: null, createdGoal: false, createdHabit: false };
  }

  const seedKey = buildDayZeroStarterSeedKey(input);
  const lifeWheelCategory = getDayZeroLifeWheelCategory(input.lifeArea);
  const goalTitle = buildGoalTitle(input.lifeArea, habitTitle);
  const existingGoal = await findExistingDayZeroGoal(seedKey, goalTitle, input.userId);

  let goalId = existingGoal?.id ?? null;
  let createdGoal = false;

  if (!goalId) {
    const { data, error } = await insertGoal({
      user_id: input.userId,
      title: goalTitle,
      description: buildGoalDescription(input),
      life_wheel_category: lifeWheelCategory,
      status_tag: 'on_track',
      progress_notes: buildGoalProgressNotes(input, seedKey),
      timing_notes: buildGoalTimingNotes(input),
      why_it_matters: 'Created from Day Zero onboarding to turn the first tiny win into a real starter goal.',
    });
    if (error) throw error;
    goalId = data?.id ?? null;
    createdGoal = Boolean(goalId);
  }

  const existingHabit = await findExistingDayZeroHabit(seedKey, habitTitle, input.userId, lifeWheelCategory);
  let habitId = existingHabit?.id ?? null;
  let createdHabit = false;

  if (!habitId) {
    const { data, error } = await quickAddDailyHabit(
      {
        title: habitTitle,
        domainKey: lifeWheelCategory,
        goalId,
        emoji: '🌱',
        habitIntent: `Source: ${DAY_ZERO_SOURCE}\nSeed: ${seedKey}`,
      },
      input.userId,
    );
    if (error) throw error;
    habitId = data?.id ?? null;
    createdHabit = Boolean(habitId);
  }

  return { goalId, habitId, createdGoal, createdHabit };
}

async function findExistingDayZeroGoal(
  seedKey: string,
  goalTitle: string,
  userId: string,
): Promise<GoalRow | null> {
  const { data, error } = await fetchGoals();
  if (error) throw error;
  return (data ?? []).find((goal) => (
    goal.user_id === userId && (
      goal.progress_notes?.includes(seedKey) || normalizeForSeed(goal.title) === normalizeForSeed(goalTitle)
    )
  )) ?? null;
}

async function findExistingDayZeroHabit(
  seedKey: string,
  habitTitle: string,
  userId: string,
  lifeWheelCategory: LifeWheelCategoryKey | null,
) {
  const { data, error } = await listHabitsV2({ includeInactive: true });
  if (error) throw error;
  return (data ?? []).find((habit) => (
    habit.user_id === userId && (
      habit.habit_intent?.includes(seedKey) || (
        normalizeForSeed(habit.title) === normalizeForSeed(habitTitle) &&
        (lifeWheelCategory === null || habit.domain_key === lifeWheelCategory)
      )
    )
  )) ?? null;
}

function buildGoalTitle(lifeArea: string, habitTitle: string): string {
  const area = lifeArea.trim();
  return area ? `Build a ${area} habit: ${habitTitle}` : `Build a tiny habit: ${habitTitle}`;
}

function buildGoalDescription(input: DayZeroStarterInput): string {
  const reward = input.reward.trim() || 'a small reward';
  return `Start with the tiny habit “${input.habit.trim()}” and reinforce it with ${reward}.`;
}

function buildGoalProgressNotes(input: DayZeroStarterInput, seedKey: string): string {
  return [
    `Source: ${DAY_ZERO_SOURCE}`,
    `Seed: ${seedKey}`,
    `Reminder preference: ${input.reminder || 'No reminder selected'}`,
    `Reward: ${input.reward || 'No reward selected'}`,
  ].join('\n');
}

function buildGoalTimingNotes(input: DayZeroStarterInput): string | null {
  if (!input.reminder || input.reminder === 'No reminder') return null;
  return `Preferred reminder window from onboarding: ${input.reminder}.`;
}

function normalizeForSeed(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
