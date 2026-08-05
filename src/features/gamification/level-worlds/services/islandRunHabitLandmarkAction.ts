import {
  isHabitLifecycleActive,
  listHabitsV2,
  listHabitLogsForWeekV2,
  listTodayHabitLogsV2,
  recordHabitCompletion,
  type HabitLogV2Row,
  type HabitV2Row,
} from '../../../../services/habitsV2';
import { isHabitScheduledToday } from '../../../habits/scheduleInterpreter';
import { recordChallengeActivity } from '../../../../services/challenges';
import { claimDailySpinHabitBonusOncePerDay } from '../../../../services/dailySpin';
import {
  recordGameLifeIntake,
  type GameLifeIntakeStage,
} from '../../../../services/gameLifeIntake';

export type HabitLandmarkChoice = Pick<
  HabitV2Row,
  'id' | 'title' | 'emoji' | 'type' | 'target_num' | 'target_unit' | 'domain_key'
>;

export type HabitLandmarkContextResult = {
  habits: HabitV2Row[];
  todayLogs: HabitLogV2Row[];
  weekLogs: HabitLogV2Row[];
  choices: HabitLandmarkChoice[];
  activeHabitCount: number;
  todayHabitCount: number;
};

export type CompleteHabitLandmarkResult =
  | {
      ok: true;
      habit: HabitLandmarkChoice;
      wasAlreadyCompleted: false;
    }
  | {
      ok: false;
      code: 'already_completed' | 'not_eligible' | 'load_failed' | 'completion_failed';
      message: string;
    };

/**
 * Pure eligibility resolver for the Habit Landmark.
 *
 * The player may choose any active habit they own that is scheduled on Today,
 * but a habit that is already complete today cannot be reused to finish another
 * landmark or earn duplicate rewards.
 */
export function selectHabitLandmarkChoices(
  habits: ReadonlyArray<HabitV2Row>,
  todayLogs: ReadonlyArray<Pick<HabitLogV2Row, 'habit_id' | 'done'>>,
  userId: string,
  weekLogs: ReadonlyArray<HabitLogV2Row> = [],
  referenceDate: Date = new Date(),
): HabitLandmarkChoice[] {
  const completedHabitIds = new Set(
    todayLogs
      .filter((log) => log.done)
      .map((log) => log.habit_id),
  );

  return habits
    .filter((habit) => (
      habit.user_id === userId
      && !habit.archived
      && isHabitLifecycleActive(habit)
      && Boolean(habit.title?.trim())
      && isHabitScheduledToday(
        habit,
        referenceDate,
        weekLogs.filter((log) => log.habit_id === habit.id),
      )
      && !completedHabitIds.has(habit.id)
    ))
    .map((habit) => ({
      id: habit.id,
      title: habit.title.trim(),
      emoji: habit.emoji,
      type: habit.type,
      target_num: habit.target_num,
      target_unit: habit.target_unit,
      domain_key: habit.domain_key,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

export async function loadHabitLandmarkContext(
  userId: string,
): Promise<{ data: HabitLandmarkContextResult | null; error: string | null }> {
  const [habitsResult, logsResult] = await Promise.all([
    listHabitsV2(),
    listTodayHabitLogsV2(userId),
  ]);

  if (habitsResult.error || !habitsResult.data) {
    return {
      data: null,
      error: habitsResult.error?.message ?? 'Your active habits could not be loaded.',
    };
  }
  if (logsResult.error || !logsResult.data) {
    return {
      data: null,
      error: logsResult.error?.message ?? 'Today’s habit progress could not be loaded.',
    };
  }

  const activeHabits = habitsResult.data.filter((habit) => (
    habit.user_id === userId
    && !habit.archived
    && isHabitLifecycleActive(habit)
  ));
  const weekLogsResult = await listHabitLogsForWeekV2(
    userId,
    activeHabits.map((habit) => habit.id),
  );
  if (weekLogsResult.error || !weekLogsResult.data) {
    return {
      data: null,
      error: weekLogsResult.error?.message ?? 'This week’s habit progress could not be loaded.',
    };
  }
  const weekLogs = weekLogsResult.data;
  const referenceDate = new Date();
  const todayHabits = activeHabits.filter((habit) => isHabitScheduledToday(
    habit,
    referenceDate,
    weekLogs.filter((log) => log.habit_id === habit.id),
  ));

  return {
    data: {
      habits: habitsResult.data,
      todayLogs: logsResult.data,
      weekLogs,
      choices: selectHabitLandmarkChoices(
        habitsResult.data,
        logsResult.data,
        userId,
        weekLogs,
        referenceDate,
      ),
      activeHabitCount: activeHabits.length,
      todayHabitCount: todayHabits.length,
    },
    error: null,
  };
}

/**
 * Canonical action for completing an existing habit from the Habit Landmark.
 * Habit completion is idempotent, and all secondary contributions are recorded
 * only after a genuinely new completion.
 */
export async function completeHabitLandmarkChoice(input: {
  userId: string;
  habitId: string;
  islandNumber: number;
  intakeStage: GameLifeIntakeStage;
}): Promise<CompleteHabitLandmarkResult> {
  const contextResult = await loadHabitLandmarkContext(input.userId);
  if (!contextResult.data) {
    return {
      ok: false,
      code: 'load_failed',
      message: contextResult.error ?? 'Your habits could not be checked.',
    };
  }

  const habit = contextResult.data.choices.find((choice) => choice.id === input.habitId);
  if (!habit) {
    const alreadyCompleted = contextResult.data.todayLogs.some((log) => (
      log.habit_id === input.habitId && log.done
    ));
    return {
      ok: false,
      code: alreadyCompleted ? 'already_completed' : 'not_eligible',
      message: alreadyCompleted
        ? 'That habit is already complete today. Choose another habit.'
        : 'That habit is no longer available. Choose another habit.',
    };
  }

  const completionResult = await recordHabitCompletion(habit.id, input.userId);
  if (completionResult.error || !completionResult.data?.completed) {
    return {
      ok: false,
      code: 'completion_failed',
      message: completionResult.error?.message ?? 'The habit could not be completed right now.',
    };
  }
  if (completionResult.data.wasAlreadyCompleted) {
    return {
      ok: false,
      code: 'already_completed',
      message: 'That habit is already complete today. Choose another habit.',
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  void Promise.allSettled([
    recordGameLifeIntake({
      userId: input.userId,
      promptContext: 'habit_landmark',
      islandNumber: input.islandNumber,
      intakeStage: input.intakeStage,
      lifeWheelArea: habit.domain_key,
      state: 'completed',
      linkedHabitId: habit.id,
      payload: {
        outcome: 'existing_habit_completed',
        habit_title: habit.title,
        habit_type: habit.type,
        domain_key: habit.domain_key,
      },
    }),
    claimDailySpinHabitBonusOncePerDay(input.userId, today),
  ]);
  recordChallengeActivity(input.userId, 'habit_complete');

  return {
    ok: true,
    habit,
    wasAlreadyCompleted: false,
  };
}
