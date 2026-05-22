import { resolveHabitAlternatives } from '../habitAlternativeResolver';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runHabitAlternativeResolverTests(): void {
  const sameArea = resolveHabitAlternatives(
    {
      id: 'habit-1',
      title: 'Run for 20 minutes',
      lifeWheelArea: 'Health',
      habit_intent: ['energy'],
    },
    'habit_too_hard',
  );
  assert(sameArea.length > 0, 'Should return alternatives for resolvable area');
  assert(sameArea.every((item) => item.lifeWheelArea === 'Health'), 'Alternatives should stay in same life wheel area');

  const excludesCurrentTitle = resolveHabitAlternatives(
    {
      id: 'habit-2',
      title: 'Drink one glass of water',
      lifeWheelArea: 'Health',
    },
    'habit_stale',
  );
  assert(
    excludesCurrentTitle.every((item) => item.title !== 'Drink one glass of water'),
    'Should exclude same or near-identical title',
  );

  const highFriction = resolveHabitAlternatives(
    {
      id: 'habit-3',
      title: 'Big morning routine',
      lifeWheelArea: 'Work',
      habit_intent: ['focus'],
    },
    'friction_too_high',
  );
  assertEqual(highFriction[0]?.suggestedHabitId, 'work-2-min-start', 'High friction should prefer tiny/easy options');

  const intentOverlap = resolveHabitAlternatives(
    {
      id: 'habit-4',
      title: 'Get things done',
      lifeWheelArea: 'Work',
      habit_intent: ['planning'],
    },
    'habit_stale',
  );
  assertEqual(
    intentOverlap[0]?.suggestedHabitId,
    'work-end-next-step',
    'Matching intent tags should rank above non-overlap habits',
  );

  const tieStable = resolveHabitAlternatives(
    {
      id: 'habit-5',
      title: 'Completely unrelated title',
      lifeWheelArea: 'Mind',
    },
    'habit_stale',
  );
  const tiedScores = tieStable.map((item) => item.rankScore);
  assert(
    tiedScores.every((value) => value === tiedScores[0]),
    'Test setup expects tie scores for deterministic order assertion',
  );
  const orderedTitles = [...tieStable].map((item) => item.title);
  const sortedTitles = [...orderedTitles].sort((a, b) => a.localeCompare(b));
  assertEqual(orderedTitles.join('|'), sortedTitles.join('|'), 'Ties should sort stably by title then id');

  const unresolvedArea = resolveHabitAlternatives(
    {
      id: 'habit-6',
      title: 'Unknown area habit',
      lifeWheelArea: 'Spirituality',
    },
    'motivation_unclear',
  );
  assertEqual(unresolvedArea.length, 0, 'Unresolvable area should return empty array');

  const supportive = resolveHabitAlternatives(
    {
      id: 'habit-7',
      title: 'Another habit',
      lifeWheelArea: 'Fun',
    },
    'restart_relapse_pattern',
  );
  const shameTerms = ['fail', 'failed', 'failure'];
  for (const item of supportive) {
    const copy = item.supportiveCopy.toLowerCase();
    assert(!shameTerms.some((term) => copy.includes(term)), 'Supportive copy should avoid shame/failure wording');
  }
}
