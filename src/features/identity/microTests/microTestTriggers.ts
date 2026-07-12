export type TriggerType =
  | 'level_milestone'
  | 'streak_achievement'
  | 'life_wheel_shift'
  | 'card_stagnation'
  | 'shadow_challenge'
  | 'suit_unlock'
  | 'time_based'
  | 'coach_suggested';

export type TriggerCondition = {
  minLevel?: number;
  minDaysSinceFoundation?: number;
  minStreakDays?: number;
  maxTimesCompleted?: number;
};

export type MicroTestTrigger = {
  id: string;
  type: TriggerType;
  microTestId: string;
  label: string;
  description: string;
  condition: TriggerCondition;
  priority: number; // Higher = more urgent
  repeatable: boolean;
};

/**
 * Micro-tests that currently have a reachable UI surface (the Personality
 * results-screen MicroTestPanel). Both the panel and the notification badge
 * key off this set, so the badge never advertises a test the player can't open.
 * Add a test's id here once a surface renders its flow.
 */
export const SELF_SERVE_MICRO_TEST_IDS: ReadonlySet<string> = new Set(['micro_hexaco_intro']);

/**
 * Registry of micro-test triggers.
 * Triggers define when micro-tests become available to the player.
 */
export const MICRO_TEST_TRIGGERS: MicroTestTrigger[] = [
  {
    id: 'trigger_hexaco_intro',
    type: 'level_milestone',
    microTestId: 'micro_hexaco_intro',
    label: 'Unlock deeper dimensions',
    // HEXACO measures Honesty-Humility and Emotionality — dimensions the
    // foundation test does not cover at all. Offer it as soon as the player
    // has a foundation hand, not gated behind a high level, so those two axes
    // stop reading as neutral placeholders.
    description: 'Unlock two deeper personality dimensions the foundation test does not measure',
    condition: {
      maxTimesCompleted: 1, // Only once
    },
    priority: 100,
    repeatable: false,
  },
  {
    id: 'trigger_14day_confirm_dominant',
    type: 'streak_achievement',
    microTestId: 'micro_confirm_dominant',
    label: '14-Day Streak: Confirm Dominant',
    description: 'Confirm your dominant archetype after 2 weeks of habit building',
    condition: {
      minStreakDays: 14,
      maxTimesCompleted: 1,
    },
    priority: 90,
    repeatable: false,
  },
  {
    id: 'trigger_90day_deck_recheck',
    type: 'time_based',
    microTestId: 'micro_hexaco_intro',
    label: 'Quarterly Deck Recheck',
    description: 'Refresh your deck with a quick check-in',
    condition: {
      minDaysSinceFoundation: 90,
    },
    priority: 50,
    repeatable: true,
  },
];

/**
 * Player state interface for trigger evaluation
 */
export type PlayerState = {
  level: number;
  currentStreakDays: number;
  daysSinceFoundationTest: number;
  completedMicroTests: string[]; // IDs of completed micro-tests
  /** Micro-tests are meaningless without a foundation hand to evolve. */
  foundationTestTaken: boolean;
};

/**
 * Evaluates which micro-tests are available for the player
 */
export function evaluateAvailableMicroTests(state: PlayerState): MicroTestTrigger[] {
  // No foundation hand yet → nothing to confirm, level up, or deepen.
  if (!state.foundationTestTaken) return [];

  return MICRO_TEST_TRIGGERS.filter((trigger) => {
    // Only surface tests with a reachable UI, so the badge stays honest.
    if (!SELF_SERVE_MICRO_TEST_IDS.has(trigger.microTestId)) {
      return false;
    }

    // Check if already completed and not repeatable
    if (!trigger.repeatable && state.completedMicroTests.includes(trigger.microTestId)) {
      return false;
    }

    const { condition } = trigger;

    // Check level condition
    if (condition.minLevel !== undefined && state.level < condition.minLevel) {
      return false;
    }

    // Check streak condition
    if (condition.minStreakDays !== undefined && state.currentStreakDays < condition.minStreakDays) {
      return false;
    }

    // Check time-based condition
    if (condition.minDaysSinceFoundation !== undefined && state.daysSinceFoundationTest < condition.minDaysSinceFoundation) {
      return false;
    }

    // Check max completed condition
    if (condition.maxTimesCompleted !== undefined) {
      const completedCount = state.completedMicroTests.filter(id => id === trigger.microTestId).length;
      if (completedCount >= condition.maxTimesCompleted) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => b.priority - a.priority); // Sort by priority descending
}

/**
 * Gets the top notification (highest priority available micro-test)
 */
export function getTopMicroTestNotification(state: PlayerState): MicroTestTrigger | null {
  const available = evaluateAvailableMicroTests(state);
  return available.length > 0 ? available[0] : null;
}
