import {
  SUPER_HABITS,
  canLaunchSuperHabit,
  getSuperHabit,
  resolveSuperHabitForTitle,
} from '../superHabits';

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

  console.log('super-habits-tests: all assertions passed');
}
