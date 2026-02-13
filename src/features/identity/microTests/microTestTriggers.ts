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
 * Registry of micro-test triggers.
 * Triggers define when micro-tests become available to the player.
 */
export const MICRO_TEST_TRIGGERS: MicroTestTrigger[] = [
  {
    id: 'trigger_level_5_hexaco',
    type: 'level_milestone',
    microTestId: 'micro_hexaco_intro',
    label: 'Level 5: HEXACO Unlock',
    description: 'Unlock deeper personality dimensions with HEXACO assessment',
    condition: {
      minLevel: 5,
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
};

/**
 * Evaluates which micro-tests are available for the player
 */
export function evaluateAvailableMicroTests(state: PlayerState): MicroTestTrigger[] {
  return MICRO_TEST_TRIGGERS.filter((trigger) => {
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
