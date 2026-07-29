import type { HabitLogV2Row, HabitV2Row } from '../../../../../services/habitsV2';
import { selectHabitLandmarkChoices } from '../islandRunHabitLandmarkAction';
import { assertDeepEqual, type TestCase } from './testHarness';

function habit(
  id: string,
  title: string,
  overrides: Partial<HabitV2Row> = {},
): HabitV2Row {
  return {
    id,
    title,
    user_id: 'user-1',
    archived: false,
    status: 'active',
    emoji: null,
    type: 'boolean',
    target_num: null,
    target_unit: null,
    domain_key: null,
    schedule: { mode: 'daily' },
    ...overrides,
  } as HabitV2Row;
}

function completedLog(habitId: string): Pick<HabitLogV2Row, 'habit_id' | 'done'> {
  return { habit_id: habitId, done: true };
}

export const islandRunHabitLandmarkActionTests: TestCase[] = [
  {
    name: 'offers every owned active unfinished habit and sorts choices by title',
    run: () => {
      const choices = selectHabitLandmarkChoices(
        [
          habit('z', 'Write one line'),
          habit('a', 'A short walk', { type: 'duration', target_num: 10, target_unit: 'minutes' }),
          habit('done', 'Already done'),
        ],
        [completedLog('done')],
        'user-1',
      );

      assertDeepEqual(
        choices.map((choice) => choice.id),
        ['a', 'z'],
        'Any active habit type should be eligible, while completed habits stay hidden',
      );
    },
  },
  {
    name: 'offers only habits that belong on Today for the reference date',
    run: () => {
      const wednesday = new Date('2026-07-29T12:00:00');
      const choices = selectHabitLandmarkChoices(
        [
          habit('today', 'Wednesday habit', {
            schedule: { mode: 'specific_days', days: [3] },
          }),
          habit('later', 'Thursday habit', {
            schedule: { mode: 'specific_days', days: [4] },
          }),
        ],
        [],
        'user-1',
        [],
        wednesday,
      );

      assertDeepEqual(
        choices.map((choice) => choice.id),
        ['today'],
        'The landmark must mirror the habits scheduled on the Today tab',
      );
    },
  },
  {
    name: 'hides a times-per-week habit once its weekly target is met',
    run: () => {
      const weeklyHabit = habit('weekly', 'Move three times', {
        schedule: { mode: 'times_per_week', timesPerWeek: 2 },
      });
      const weekLogs = [
        { habit_id: 'weekly', done: true },
        { habit_id: 'weekly', done: true },
      ] as HabitLogV2Row[];
      const choices = selectHabitLandmarkChoices(
        [weeklyHabit],
        [],
        'user-1',
        weekLogs,
        new Date('2026-07-29T12:00:00'),
      );

      assertDeepEqual(
        choices,
        [],
        'A weekly habit no longer shown on Today must not appear in the landmark',
      );
    },
  },
  {
    name: 'rejects archived, paused, foreign, and blank-title habits',
    run: () => {
      const choices = selectHabitLandmarkChoices(
        [
          habit('valid', 'Drink water'),
          habit('archived', 'Archived', { archived: true }),
          habit('paused', 'Paused', { status: 'paused' }),
          habit('foreign', 'Someone else’s habit', { user_id: 'user-2' }),
          habit('blank', '   '),
        ],
        [],
        'user-1',
      );

      assertDeepEqual(
        choices.map((choice) => choice.id),
        ['valid'],
        'Only the current player’s genuinely active habits should be offered',
      );
    },
  },
  {
    name: 'a non-completing log does not hide the habit',
    run: () => {
      const choices = selectHabitLandmarkChoices(
        [habit('keep', 'Keep trying')],
        [{ habit_id: 'keep', done: false }],
        'user-1',
      );

      assertDeepEqual(
        choices.map((choice) => choice.id),
        ['keep'],
        'Skipped or partial logs must not count as a completed habit',
      );
    },
  },
];
