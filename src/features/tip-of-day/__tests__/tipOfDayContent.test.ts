import { assessHabitHealth } from '../../habits/habitHealth';
import {
  buildEnvironmentDeck,
  buildReshapeDeck,
  buildScienceDeck,
  buildShrinkApplyAction,
  extractSuggestionSummary,
  orderedVariationsForDate,
  pickAnchorHabit,
  pickStrugglingHabit,
  pickVariationForDate,
  selectTipDeck,
  type TipHabitInput,
  type TipHealthInput,
} from '../tipOfDayContent';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

const REFERENCE = '2026-06-28';

function habit(id: string, overrides: Partial<TipHabitInput> = {}): TipHabitInput {
  return {
    id,
    title: overrides.title ?? `Habit ${id}`,
    emoji: overrides.emoji ?? null,
    habitEnvironment: overrides.habitEnvironment ?? null,
    habitIntent: overrides.habitIntent ?? null,
    type: overrides.type,
    targetNum: overrides.targetNum,
    targetUnit: overrides.targetUnit,
  };
}

function health(
  habitId: string,
  opts: { lastCompletedOn: string | null; percentage: number; scheduledCount: number },
): TipHealthInput {
  return {
    habitId,
    assessment: assessHabitHealth({
      adherence7: { scheduledCount: opts.scheduledCount, percentage: opts.percentage },
      lastCompletedOn: opts.lastCompletedOn,
      referenceDateISO: REFERENCE,
    }),
    adherencePercent: opts.scheduledCount > 0 ? opts.percentage : null,
    hasEnoughSignal: opts.scheduledCount >= 2,
  };
}

export function runTipOfDayContentTests(): void {
  // pickVariationForDate is deterministic for the same day and cycles through all 3.
  const d1 = new Date('2026-06-28T08:00:00.000Z');
  const d1b = new Date('2026-06-28T22:00:00.000Z');
  assertEqual(pickVariationForDate(d1), pickVariationForDate(d1b), 'Same day yields same variation');
  const seen = new Set([
    pickVariationForDate(new Date('2026-06-28T00:00:00.000Z')),
    pickVariationForDate(new Date('2026-06-29T00:00:00.000Z')),
    pickVariationForDate(new Date('2026-06-30T00:00:00.000Z')),
  ]);
  assertEqual(seen.size, 3, 'Three consecutive days cover all three variations');

  // orderedVariationsForDate starts with the rotated variation and lists all three.
  const ordered = orderedVariationsForDate(d1);
  assertEqual(ordered.length, 3, 'Ordered variations has length 3');
  assertEqual(ordered[0], pickVariationForDate(d1), 'Ordered list starts with the day variation');

  // pickStrugglingHabit selects the highest-severity habit with enough signal.
  const habits = [habit('h1', { title: 'Drink water' }), habit('h2', { title: 'Read' }), habit('h3', { title: 'Walk' })];
  const healths = [
    health('h1', { lastCompletedOn: REFERENCE, percentage: 100, scheduledCount: 7 }), // active
    health('h2', { lastCompletedOn: '2026-06-20', percentage: 20, scheduledCount: 7 }), // at_risk (8 days)
    health('h3', { lastCompletedOn: '2026-05-01', percentage: 0, scheduledCount: 7 }), // in_review (58 days)
  ];
  const struggling = pickStrugglingHabit(habits, healths);
  assert(struggling !== null, 'Finds a struggling habit');
  assertEqual(struggling!.habit.id, 'h3', 'Picks the most severe (in_review) habit');

  // Habits without enough signal are ignored.
  const lowSignal = pickStrugglingHabit(
    [habit('only')],
    [health('only', { lastCompletedOn: '2026-06-20', percentage: 0, scheduledCount: 1 })],
  );
  assertEqual(lowSignal, null, 'Ignores habits without enough signal');

  // No struggling habit at all.
  const allHealthy = pickStrugglingHabit(habits, [
    health('h1', { lastCompletedOn: REFERENCE, percentage: 100, scheduledCount: 7 }),
  ]);
  assertEqual(allHealthy, null, 'Returns null when nothing is struggling');

  // buildReshapeDeck teaches the loop: first card is "Did you know?", and the deck
  // is wired to the struggling habit with an "applied" CTA.
  const reshape = buildReshapeDeck({ habit: habits[2], health: healths[2] });
  assertEqual(reshape.variation, 'reshape_struggling', 'Reshape deck has correct variation');
  assertEqual(reshape.habitId, 'h3', 'Reshape deck is wired to the habit');
  assertEqual(reshape.cards[0].kicker, 'Did you know?', 'Reshape deck opens with Did you know?');
  assert(reshape.cards.some((c) => c.id === 'reshape-cue'), 'Reshape deck has a cue card');
  assert(reshape.cards.some((c) => c.id === 'reshape-reward'), 'Reshape deck has a reward card');
  assertEqual(reshape.primaryCtaAction, 'applied', 'Reshape CTA records applied');

  // buildScienceDeck works with and without a habit, always opening with Did you know?
  const science = buildScienceDeck(habits[0]);
  assertEqual(science.variation, 'habit_science', 'Science deck variation');
  assertEqual(science.cards[0].kicker, 'Did you know?', 'Science deck opens with Did you know?');
  assert(science.cards[science.cards.length - 1].body.includes('Drink water'), 'Science deck anchors to the habit name');
  const scienceNoHabit = buildScienceDeck(null);
  assert(scienceNoHabit.cards.length > 0, 'Science deck works with no habit');

  // buildEnvironmentDeck surfaces the stored cue when present.
  const withCue = buildEnvironmentDeck(habit('e1', { title: 'Stretch', habitEnvironment: 'After brushing teeth' }));
  assertEqual(withCue.variation, 'environment_cue', 'Environment deck variation');
  assert(
    withCue.cards.some((c) => c.body.includes('After brushing teeth')),
    'Environment deck uses the stored cue text',
  );

  // pickAnchorHabit prefers a habit without an environment cue set.
  const anchor = pickAnchorHabit([
    habit('a1', { habitEnvironment: 'On my desk' }),
    habit('a2', { habitEnvironment: null }),
  ]);
  assertEqual(anchor!.id, 'a2', 'Anchor prefers a habit missing its cue');

  // selectTipDeck degrades gracefully: science when there are no habits.
  const emptyDeck = selectTipDeck({ habits: [], health: [], date: d1 });
  assertEqual(emptyDeck.variation, 'habit_science', 'Falls back to science with zero habits');

  // selectTipDeck returns reshape on a reshape-first day when a struggling habit exists.
  const reshapeDay = findDateForVariation('reshape_struggling');
  const selected = selectTipDeck({ habits, health: healths, date: reshapeDay });
  assertEqual(selected.variation, 'reshape_struggling', 'Selects reshape when struggling habit present on reshape day');

  // buildShrinkApplyAction only applies to quantity/duration with a shrinkable target.
  assertEqual(buildShrinkApplyAction(habit('b', {})), null, 'No shrink for boolean habits (no type)');
  const qty = habit('q', { title: 'Water', type: 'quantity', targetNum: 8, targetUnit: 'glasses' });
  const shrink = buildShrinkApplyAction(qty);
  assert(shrink !== null, 'Shrink available for quantity habit');
  assertEqual(shrink!.newTarget, 4, 'Halves the target');
  assertEqual(shrink!.currentTarget, 8, 'Records current target');
  assert(shrink!.label.includes('4 glasses'), 'Label mentions new target + unit');
  assertEqual(
    buildShrinkApplyAction(habit('q1', { type: 'duration', targetNum: 1 })),
    null,
    'No shrink when target already minimal',
  );

  // A reshape deck for a shrinkable habit carries the apply action + matching CTA.
  const reshapeQty = buildReshapeDeck({ habit: qty, health: healths[1] });
  assert(reshapeQty.applyAction != null, 'Reshape deck has an apply action for shrinkable habit');
  assertEqual(reshapeQty.primaryCtaLabel, reshapeQty.applyAction!.label, 'CTA label matches apply action');

  // extractSuggestionSummary prefers the suggestion card and combines heading + body.
  const summaryText = extractSuggestionSummary(reshape);
  assert(summaryText !== null, 'Extracts a suggestion summary from a stored deck');
  assertEqual(extractSuggestionSummary(null), null, 'Null payload yields null');
  assertEqual(extractSuggestionSummary({ cards: [] }), null, 'Empty cards yields null');
  const envSummary = extractSuggestionSummary(buildEnvironmentDeck(habits[0]));
  assert(envSummary !== null, 'Extracts summary from environment deck (env-apply card)');
}

function findDateForVariation(target: string): Date {
  for (let offset = 0; offset < 6; offset += 1) {
    const date = new Date(Date.UTC(2026, 5, 28 + offset, 12, 0, 0));
    if (pickVariationForDate(date) === target) {
      return date;
    }
  }
  throw new Error(`Could not find a date for variation ${target}`);
}
