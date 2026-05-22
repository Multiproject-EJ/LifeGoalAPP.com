import { resolveHabitAlternatives } from '../habitAlternativeResolver';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runAllHabitAlternativeResolverTests(): void {
  const sameArea = resolveHabitAlternatives(
    {
      id: 'current-1',
      title: 'Drink water daily',
      lifeWheelArea: 'Health',
      habit_intent: ['energy'],
    },
    'habit_too_hard',
  );

  assert(sameArea.length > 0, 'expected alternatives for resolvable area');
  assert(sameArea.every((row) => row.lifeWheelArea === 'Health'), 'alternatives must be from same life wheel area');

  const excludesSameTitle = resolveHabitAlternatives(
    {
      id: 'current-2',
      title: 'Walk for 5 minutes',
      lifeWheelArea: 'Health',
    },
    'habit_stale',
  );
  assert(!excludesSameTitle.some((row) => row.title === 'Walk for 5 minutes'), 'should exclude same title');

  const highFriction = resolveHabitAlternatives(
    {
      id: 'current-3',
      title: 'Run 30 minutes',
      lifeWheelArea: 'Work',
      habit_intent: ['focus'],
    },
    'friction_too_high',
  );
  assert(highFriction.length > 0, 'expected high friction alternatives');
  assert(highFriction[0].suggestedHabitId === 'work-2-min-start', 'high friction should prefer tiny/easy first');

  const intentRank = resolveHabitAlternatives(
    {
      id: 'current-4',
      title: 'Do deep work',
      lifeWheelArea: 'Work',
      habit_intent: ['planning'],
    },
    'motivation_unclear',
  );
  assert(intentRank[0].suggestedHabitId === 'work-end-next-step', 'intent overlap should rank highest');

  const stableOrder = resolveHabitAlternatives(
    {
      id: 'current-5',
      title: 'Something unrelated',
      lifeWheelArea: 'Growth',
      habit_intent: [],
    },
    'habit_stale',
  );
  const stableIds = stableOrder.map((row) => row.suggestedHabitId).join(',');
  assert(stableIds === 'growth-learn-one-note,growth-read-one-page,growth-ask-one-question', 'ties should use stable deterministic ordering');

  const unresolvedArea = resolveHabitAlternatives(
    {
      id: 'current-6',
      title: 'Unknown area habit',
      lifeWheelArea: 'Spiritual',
    },
    'habit_stale',
  );
  assert(unresolvedArea.length === 0, 'unresolved area should return empty array');

  const supportiveCopy = resolveHabitAlternatives(
    {
      id: 'current-7',
      title: 'Any habit',
      lifeWheelArea: 'Mind',
    },
    'restart_relapse_pattern',
  );
  assert(supportiveCopy.every((row) => !/\b(fail|failed|failure)\b/i.test(row.supportiveCopy)), 'supportive copy should avoid shame language');
}
