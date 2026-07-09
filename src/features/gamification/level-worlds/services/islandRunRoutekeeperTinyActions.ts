import { recordHabitCompletion, type HabitV2Row } from '../../../../services/habitsV2';
import type { SuggestedHabit } from '../../../habits/suggestedHabitLibrary';
import {
  createIslandRunHabitFromLifePrompt,
  type IslandRunLifeIntakeResult,
} from './islandRunLifeIntakeService';

export const ROUTEKEEPER_TINY_ACTIONS = [
  'Drink one glass of water.',
  'Walk for two minutes.',
  'Write one sentence.',
  'Take one deep breath.',
  'Clear one tiny task.',
] as const;

export type RoutekeeperTinyAction = typeof ROUTEKEEPER_TINY_ACTIONS[number];

export const ROUTEKEEPER_SUCCESS_TITLE = 'Routekeeper Steps relit.';
export const ROUTEKEEPER_SUCCESS_BODY = 'One steady action is enough for today.';

const ROUTEKEEPER_TINY_ACTION_META: Record<RoutekeeperTinyAction, Pick<SuggestedHabit, 'lifeWheelArea' | 'goalIntentTags' | 'emoji' | 'defaultTiming'>> = {
  'Drink one glass of water.': { lifeWheelArea: 'Health', goalIntentTags: ['hydration', 'energy'], emoji: '💧', defaultTiming: 'anytime' },
  'Walk for two minutes.': { lifeWheelArea: 'Health', goalIntentTags: ['movement', 'energy'], emoji: '🚶', defaultTiming: 'anytime' },
  'Write one sentence.': { lifeWheelArea: 'Mind', goalIntentTags: ['clarity', 'reflection'], emoji: '✍️', defaultTiming: 'anytime' },
  'Take one deep breath.': { lifeWheelArea: 'Mind', goalIntentTags: ['calm', 'focus'], emoji: '🌬️', defaultTiming: 'anytime' },
  'Clear one tiny task.': { lifeWheelArea: 'Work', goalIntentTags: ['momentum', 'focus'], emoji: '✅', defaultTiming: 'anytime' },
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
