import {
  createHabitV2,
  listHabitsV2,
  recordHabitCompletion,
  type HabitV2Row,
} from '../../../../services/habitsV2';
import { awardZenTokens } from '../../../../services/zenGarden';
import type { SuggestedHabit } from '../../../habits/suggestedHabitLibrary';
import {
  createIslandRunHabitFromLifePrompt,
  type IslandRunLifeIntakeResult,
} from './islandRunLifeIntakeService';

export const ROUTEKEEPER_FIRST_QUESTION = 'What is one good thing you already do, even sometimes?';
export const ROUTEKEEPER_BODY_COPY = 'Miri studies your signal. The route does not need a perfect new habit. It needs one real thing you already care about.';

export const ROUTEKEEPER_SIGNAL_CHOICES = [
  { id: 'body', label: 'Body', body: 'I already try to move, stretch, walk, or train.', action: 'Move for two minutes.' },
  { id: 'energy', label: 'Energy', body: 'I already try to eat, drink, sleep, or recover better.', action: 'Drink one glass of water.' },
  { id: 'mind', label: 'Mind', body: 'I already reflect, write, pray, meditate, or notice things.', action: 'Write one honest sentence.' },
  { id: 'home', label: 'Home', body: 'I already reset, tidy, clean, or organise small things.', action: 'Reset one small surface.' },
  { id: 'future', label: 'Future', body: 'I already work on money, learning, focus, or goals.', action: 'Do one two-minute focus step.' },
  { id: 'connection', label: 'Connection', body: 'I already care for people, messages, or relationships.', action: 'Send or answer one kind message.' },
] as const;

export type RoutekeeperSignalChoice = typeof ROUTEKEEPER_SIGNAL_CHOICES[number];
export type RoutekeeperSignalId = RoutekeeperSignalChoice['id'];

export const ROUTEKEEPER_TINY_ACTIONS = ROUTEKEEPER_SIGNAL_CHOICES.map((choice) => choice.action);

export type RoutekeeperTinyAction = typeof ROUTEKEEPER_TINY_ACTIONS[number];

export function getRoutekeeperTinyActionForSignal(signalId: RoutekeeperSignalId): RoutekeeperTinyAction {
  return ROUTEKEEPER_SIGNAL_CHOICES.find((choice) => choice.id === signalId)?.action ?? ROUTEKEEPER_SIGNAL_CHOICES[0].action;
}

export const ROUTEKEEPER_SUCCESS_TITLE = 'Routekeeper Steps relit.';
export const ROUTEKEEPER_SUCCESS_BODY = 'One steady action is enough for today.';
export const ROUTEKEEPER_BREATH_HABIT_TITLE = 'Take one 5-second breath';
export const ROUTEKEEPER_BREATH_HABIT_MARKER = 'habitgame:day-one-breath-v1';
export const ROUTEKEEPER_BREATH_LOTUS_REWARD = 1;

export function isRoutekeeperBreathingHabit(
  habit: {
    title?: string | null;
    name?: string | null;
    habit_environment?: string | null;
  },
): boolean {
  return (habit.title ?? habit.name) === ROUTEKEEPER_BREATH_HABIT_TITLE
    || Boolean(habit.habit_environment?.includes(ROUTEKEEPER_BREATH_HABIT_MARKER));
}

export function buildRoutekeeperBreathingHabitPayload(now = new Date()) {
  const startAt = now.toISOString();
  const endAt = new Date(now);
  endAt.setDate(endAt.getDate() + 7);

  return {
    title: ROUTEKEEPER_BREATH_HABIT_TITLE,
    emoji: '🌬️',
    type: 'boolean' as const,
    allow_skip: true,
    schedule: { mode: 'daily' as const },
    target_num: 1,
    target_unit: 'breath',
    habit_intent: 'build',
    duration_mode: 'fixed_window',
    duration_value: 7,
    duration_unit: 'days',
    duration_start_at: startAt,
    duration_end_at: endAt.toISOString(),
    on_duration_end: 'pause',
    habit_environment: [
      ROUTEKEEPER_BREATH_HABIT_MARKER,
      'Created inside Island Run at the Routekeeper Steps',
      'Seven-day starter ritual',
      `Reward: ${ROUTEKEEPER_BREATH_LOTUS_REWARD} Lotus Flower per daily completion`,
    ].join(' · '),
  };
}

export async function createRoutekeeperBreathingHabit(
  userId: string,
  now = new Date(),
): Promise<{ ok: boolean; habit: HabitV2Row | null; wasAlreadyPresent: boolean; message: string }> {
  const existingResult = await listHabitsV2({ includeInactive: true });
  const existing = existingResult.data?.find(
    (habit) => habit.user_id === userId && isRoutekeeperBreathingHabit(habit),
  );
  if (existing) {
    return {
      ok: true,
      habit: existing,
      wasAlreadyPresent: true,
      message: 'Your seven-day breathing habit is already on Today.',
    };
  }

  const created = await createHabitV2(buildRoutekeeperBreathingHabitPayload(now), userId);
  if (created.error || !created.data) {
    return {
      ok: false,
      habit: null,
      wasAlreadyPresent: false,
      message: created.error?.message ?? 'Could not add the breathing habit right now.',
    };
  }

  return {
    ok: true,
    habit: created.data,
    wasAlreadyPresent: false,
    message: 'Seven-day breathing habit added to Today.',
  };
}

export async function completeRoutekeeperBreathingHabit(
  habit: Pick<HabitV2Row, 'id'>,
  userId: string,
) {
  return recordHabitCompletion(habit.id, userId);
}

export async function awardRoutekeeperBreathLotusOnce(input: {
  userId: string;
  habitId: string;
  dateISO?: string;
}) {
  const dateISO = input.dateISO ?? new Date().toISOString().slice(0, 10);
  const rewardKey = `habitgame:day-one-breath-lotus:${input.userId}:${input.habitId}:${dateISO}`;
  if (typeof window !== 'undefined' && window.localStorage.getItem(rewardKey) === 'awarded') {
    return { ok: true, alreadyAwarded: true, balance: null, error: null };
  }

  const result = await awardZenTokens(
    input.userId,
    ROUTEKEEPER_BREATH_LOTUS_REWARD,
    'day_one_breath_habit',
    `${input.habitId}:${dateISO}`,
    'Completed the Routekeeper five-second breathing ritual',
  );
  if (result.error || !result.data) {
    return {
      ok: false,
      alreadyAwarded: false,
      balance: null,
      error: result.error ?? new Error('Lotus Flower reward could not be saved.'),
    };
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(rewardKey, 'awarded');
    window.dispatchEvent(new CustomEvent('gamificationProfileUpdated', {
      detail: { userId: input.userId },
    }));
  }
  return {
    ok: true,
    alreadyAwarded: false,
    balance: result.data.balance,
    error: null,
  };
}

const ROUTEKEEPER_TINY_ACTION_META: Record<RoutekeeperTinyAction, Pick<SuggestedHabit, 'lifeWheelArea' | 'goalIntentTags' | 'emoji' | 'defaultTiming'>> = {
  'Drink one glass of water.': { lifeWheelArea: 'Health', goalIntentTags: ['hydration', 'energy'], emoji: '💧', defaultTiming: 'anytime' },
  'Move for two minutes.': { lifeWheelArea: 'Health', goalIntentTags: ['movement', 'energy'], emoji: '🚶', defaultTiming: 'anytime' },
  'Write one honest sentence.': { lifeWheelArea: 'Mind', goalIntentTags: ['clarity', 'reflection'], emoji: '✍️', defaultTiming: 'anytime' },
  'Reset one small surface.': { lifeWheelArea: 'Home', goalIntentTags: ['reset', 'environment'], emoji: '🏠', defaultTiming: 'anytime' },
  'Do one two-minute focus step.': { lifeWheelArea: 'Work', goalIntentTags: ['momentum', 'focus'], emoji: '✅', defaultTiming: 'anytime' },
  'Send or answer one kind message.': { lifeWheelArea: 'Connections', goalIntentTags: ['connection', 'care'], emoji: '💬', defaultTiming: 'anytime' },
};

export function hasSuitableRoutekeeperHabit(habits: ReadonlyArray<Pick<HabitV2Row, 'archived' | 'status' | 'title'>>): boolean {
  return habits.some((habit) => {
    const title = habit.title?.trim();
    return Boolean(title) && !habit.archived && (!habit.status || habit.status === 'active');
  });
}

export function buildRoutekeeperSuggestedHabit(action: RoutekeeperTinyAction): SuggestedHabit {
  const meta = ROUTEKEEPER_TINY_ACTION_META[action];
  const normalized = action.replace(/\.$/, '');
  return {
    suggestedHabitId: `routekeeper-${normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    title: normalized,
    lifeWheelArea: meta.lifeWheelArea,
    goalIntentTags: meta.goalIntentTags,
    difficultyTier: 'tiny',
    tinyVersion: action,
    normalVersion: action,
    stretchVersion: action,
    cueSuggestions: ['Today, when you see the Routekeeper Steps'],
    environmentHacks: ['Keep it small enough to do immediately'],
    blockerTags: ['new-player', 'low-friction'],
    defaultTiming: meta.defaultTiming,
    emoji: meta.emoji,
  };
}

export interface CreateAndCompleteRoutekeeperTinyActionResult {
  ok: boolean;
  habit: HabitV2Row | null;
  created: IslandRunLifeIntakeResult | null;
  completion: { completed: boolean; wasAlreadyCompleted: boolean } | null;
  message: string;
}

export async function createAndCompleteRoutekeeperTinyAction(input: {
  userId: string;
  action: RoutekeeperTinyAction;
}): Promise<CreateAndCompleteRoutekeeperTinyActionResult> {
  const selectedHabit = buildRoutekeeperSuggestedHabit(input.action);
  const created = await createIslandRunHabitFromLifePrompt({
    userId: input.userId,
    selectedHabit,
    selectedSize: 'Tiny',
    selectedTiming: 'Anytime',
  });
  if (!created.ok || !created.habit) {
    return { ok: false, habit: null, created, completion: null, message: created.message };
  }

  const completionResult = await recordHabitCompletion(created.habit.id, input.userId);
  if (completionResult.error || !completionResult.data?.completed) {
    return {
      ok: false,
      habit: created.habit,
      created,
      completion: null,
      message: completionResult.error?.message ?? 'Habit created, but completion could not be recorded yet.',
    };
  }

  return {
    ok: true,
    habit: created.habit,
    created,
    completion: completionResult.data,
    message: ROUTEKEEPER_SUCCESS_TITLE,
  };
}
