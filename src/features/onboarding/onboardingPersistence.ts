import { fetchGoals, insertGoal } from '../../services/goals';
import { listHabitsV2, quickAddDailyHabit } from '../../services/habitsV2';

export const GAME_OF_LIFE_ONBOARDING_SOURCE = 'game_of_life_onboarding_goal_habit_seed';
export const DAY_ZERO_ONBOARDING_SOURCE = 'day_zero_onboarding_goal_habit_seed';

export type OnboardingStarterSource =
  | typeof GAME_OF_LIFE_ONBOARDING_SOURCE
  | typeof DAY_ZERO_ONBOARDING_SOURCE
  | string;

type PersistOnboardingStarterRecordsInput = {
  userId: string;
  goalName?: string | null;
  habitName?: string | null;
  source: OnboardingStarterSource;
};

type StarterRecordResult = {
  id: string | null;
  created: boolean;
  skipped: boolean;
};

export type OnboardingStarterPersistenceResult = {
  goal: StarterRecordResult;
  habit: StarterRecordResult;
};

const emptyResult: StarterRecordResult = { id: null, created: false, skipped: true };

function normalizeStarterName(value?: string | null): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function namesMatch(left: string | null | undefined, right: string): boolean {
  return normalizeStarterName(left).toLocaleLowerCase() === right.toLocaleLowerCase();
}

export async function persistOnboardingStarterRecords({
  userId,
  goalName,
  habitName,
  source,
}: PersistOnboardingStarterRecordsInput): Promise<OnboardingStarterPersistenceResult> {
  const normalizedGoalName = normalizeStarterName(goalName);
  const normalizedHabitName = normalizeStarterName(habitName);

  const result: OnboardingStarterPersistenceResult = {
    goal: emptyResult,
    habit: emptyResult,
  };

  if (normalizedGoalName) {
    const existingGoals = await fetchGoals();
    const existingGoal = existingGoals.data?.find((goal) => namesMatch(goal.title, normalizedGoalName));

    if (existingGoal) {
      result.goal = { id: existingGoal.id, created: false, skipped: false };
    } else {
      const createdGoal = await insertGoal({
        user_id: userId,
        title: normalizedGoalName,
        description: `Starter goal created from ${source}.`,
        status_tag: 'on_track',
      });
      if (createdGoal.error) throw createdGoal.error;
      result.goal = { id: createdGoal.data?.id ?? null, created: true, skipped: false };
    }
  }

  if (normalizedHabitName) {
    const existingHabits = await listHabitsV2({ includeInactive: true });
    const existingHabit = existingHabits.data?.find((habit) => namesMatch(habit.title, normalizedHabitName));

    if (existingHabit) {
      result.habit = { id: existingHabit.id, created: false, skipped: false };
    } else {
      const createdHabit = await quickAddDailyHabit(
        {
          title: normalizedHabitName,
          habit_intent: `Starter habit created from ${source}.`,
        },
        userId,
      );
      if (createdHabit.error) throw createdHabit.error;
      result.habit = { id: createdHabit.data?.id ?? null, created: true, skipped: false };
    }
  }

  return result;
}
