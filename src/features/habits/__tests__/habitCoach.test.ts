import {
  buildHabitCoachCard,
  isStrugglingHealthState,
  type HabitCoachSignals,
} from '../habitCoach';
import type { HabitHealthAssessment, HabitHealthState } from '../habitHealth';

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

function assessment(
  state: HabitHealthState,
  overrides: Partial<HabitHealthAssessment> = {},
): HabitHealthAssessment {
  return {
    state,
    daysSinceCompletion: null,
    reviewDueAt: null,
    rationale: 'rationale text',
    ...overrides,
  };
}

function signals(overrides: Partial<HabitCoachSignals> = {}): HabitCoachSignals {
  return {
    habitName: 'Morning run',
    assessment: assessment('at_risk', { daysSinceCompletion: 3 }),
    adherencePercent: 30,
    streakDays: 0,
    hasDownshiftOption: true,
    hasEnvironmentCue: false,
    ...overrides,
  };
}

export function runAllHabitCoachTests(): void {
  // ---- isStrugglingHealthState ----
  assert(isStrugglingHealthState('at_risk'), 'at_risk is struggling');
  assert(isStrugglingHealthState('stalled'), 'stalled is struggling');
  assert(isStrugglingHealthState('in_review'), 'in_review is struggling');
  assert(!isStrugglingHealthState('active'), 'active is not struggling');

  // ---- healthy habits get no coach card ----
  const healthy = buildHabitCoachCard(signals({ assessment: assessment('active') }));
  assertEqual(healthy, null, 'active habit returns null');

  // ---- at_risk card ----
  const atRisk = buildHabitCoachCard(signals());
  assert(atRisk != null, 'at_risk returns a card');
  assertEqual(atRisk!.state, 'at_risk', 'at_risk state preserved');
  assert(atRisk!.tips.length > 0 && atRisk!.tips.length <= 3, 'tips are capped at 3');
  assert(
    atRisk!.tips.some((t) => t.id === 'protect'),
    'at_risk includes the protect-the-streak tip',
  );
  assert(atRisk!.message.includes('30%'), 'at_risk message uses adherence percent');
  assert(
    atRisk!.aiPrompt.includes('Morning run') && atRisk!.aiPrompt.includes('rationale text'),
    'aiPrompt embeds habit name + rationale',
  );

  // ---- environment cue suppresses the anchor tip ----
  const withCue = buildHabitCoachCard(signals({ hasEnvironmentCue: true }));
  assert(
    !withCue!.tips.some((t) => t.id === 'anchor'),
    'anchor tip omitted when an environment cue exists',
  );
  const withoutCue = buildHabitCoachCard(signals({ hasEnvironmentCue: false }));
  assert(
    withoutCue!.tips.some((t) => t.id === 'anchor'),
    'anchor tip present when no environment cue',
  );

  // ---- stalled card ----
  const stalled = buildHabitCoachCard(
    signals({ assessment: assessment('stalled', { daysSinceCompletion: 18 }) }),
  );
  assert(stalled!.tips.some((t) => t.id === 'restart'), 'stalled includes restart tip');
  assert(stalled!.message.includes('18 days'), 'stalled message references day count');

  // ---- in_review card ----
  const inReview = buildHabitCoachCard(
    signals({ assessment: assessment('in_review', { daysSinceCompletion: 33 }) }),
  );
  assert(inReview!.tips.some((t) => t.id === 'decide'), 'in_review includes decide tip');

  // ---- no downshift option still yields a shrink tip ----
  const noDownshift = buildHabitCoachCard(signals({ hasDownshiftOption: false }));
  assert(noDownshift!.tips.some((t) => t.id === 'shrink'), 'shrink tip present without downshift');

  console.log('habit-coach-tests: all assertions passed');
}
