import { getNextDualEnginePrompt } from '../dualPromptDeliveryService';
import { selectBestNextDualPromptCandidate } from '../dualPromptPolicyEngine';
import type { DualPromptPolicyInputs } from '../dualPromptTypes';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function buildBaseInputs(overrides: Partial<DualPromptPolicyInputs> = {}): DualPromptPolicyInputs {
  return {
    habits: { hasAny: false, hasSuccessSignal: false, hasDifficultySignal: false },
    goals: { hasAny: false },
    checkins: { hasLifeWheelCheckin: true },
    profileSignals: { hasLifeAreaCoverage: true },
    history: [],
    nowMs: 2 * DAY_MS,
    ...overrides,
  };
}

export async function runAllDualPromptEngineTests(): Promise<void> {
  {
    const nowMs = 3 * DAY_MS;
    const prompt = getNextDualEnginePrompt('outside_game', buildBaseInputs({
      nowMs,
      history: [{ promptType: 'wisdom_reflection', shownAtMs: nowMs - 60_000, context: 'outside_game', completedAtMs: null }],
    }));
    assertEqual(prompt, null, 'no prompt should be returned when same prompt type cooldown is active');
  }

  {
    const prompt = selectBestNextDualPromptCandidate('outside_game', buildBaseInputs({
      checkins: { hasLifeWheelCheckin: false },
      profileSignals: { hasLifeAreaCoverage: false },
    }));
    assertEqual(prompt?.type, 'life_wheel_orientation', 'life wheel orientation should win when check-in/profile area is missing');
  }

  {
    const prompt = selectBestNextDualPromptCandidate('outside_game', buildBaseInputs({
      habits: { hasAny: true, hasSuccessSignal: false, hasDifficultySignal: false },
    }));
    assertEqual(prompt?.type, 'tiny_habit_adjustment', 'tiny habit adjustment should win when no success/difficulty signal exists');
  }

  {
    const prompt = selectBestNextDualPromptCandidate('inside_game', buildBaseInputs());
    if (!prompt) {
      throw new Error('inside_game should return a prompt candidate');
    }
    assert(
      ['yes_no', 'choice', 'rating', 'compare'].includes(prompt.answerFormat),
      'inside_game should only return micro answer formats',
    );
  }

  {
    const prompt = selectBestNextDualPromptCandidate('outside_game', buildBaseInputs());
    assertEqual(prompt?.answerFormat, 'text_optional', 'outside_game can return deeper answer formats');
  }
}
