import {
  SUPER_HABITS,
  canLaunchSuperHabit,
  getSuperHabit,
  resolveSuperHabitForTitle,
} from '../superHabits';
import { computeWellbeingShield } from '../wellbeingShield';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runAllSuperHabitTests(): void {
  const journal = getSuperHabit('journal');
  assertEqual(journal.tier, 'free', 'Journaling is free');
  assertEqual(journal.stage, 'live', 'Journaling is live');
  assert(canLaunchSuperHabit(journal), 'Journaling can launch');

  const nonJournalHabits = SUPER_HABITS.filter((habit) => habit.id !== 'journal');
  assert(nonJournalHabits.length > 0, 'The Pro roster is populated');
  nonJournalHabits.forEach((habit) => {
    assertEqual(habit.tier, 'pro', `${habit.name} is Pro`);
    assertEqual(habit.stage, 'demo', `${habit.name} is demo-only`);
    assert(!canLaunchSuperHabit(habit), `${habit.name} cannot activate while it is a demo`);
  });

  assertEqual(resolveSuperHabitForTitle('Write in my gratitude journal')?.id, 'journal', 'Journal titles resolve');
  assertEqual(resolveSuperHabitForTitle('Prepare a healthy dinner')?.id, 'eat_well', 'Food titles resolve');
  assertEqual(resolveSuperHabitForTitle('20 minute workout')?.id, 'move_body', 'Movement titles resolve');
  assertEqual(resolveSuperHabitForTitle('Read a book')?.id ?? null, null, 'Unmatched habits stay unassigned');

  const shield = computeWellbeingShield(
    [{ id: 'body-1', name: '20 minute workout' }, { id: 'mind-1', name: 'Daily journal' }],
    [
      { habit_id: 'body-1', date: '2026-07-19', completed: true },
      { habit_id: 'mind-1', date: '2026-07-19', completed: true },
      { habit_id: 'mind-1', date: '2026-07-18', completed: true },
    ],
    '2026-07-19',
    '2026-07-13',
  );
  assertEqual(shield.bodyHabitCount, 1, 'Movement powers the Body Shield');
  assertEqual(shield.mindHabitCount, 1, 'Journaling powers the Mind Shield');
  assert(shield.total > 0, 'Completed SuperHabits raise the Wellbeing Shield');
  assert(shield.healthContribution <= 10, 'Body & Health contribution is bounded');

  console.log('super-habits-tests: all assertions passed');
}
