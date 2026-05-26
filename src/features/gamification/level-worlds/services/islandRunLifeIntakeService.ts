import { createHabitV2, type HabitV2Row } from '../../../../services/habitsV2';
import type { SuggestedHabit } from '../../../habits/suggestedHabitLibrary';
import { type IslandRunHabitTimingChoice } from './islandRunLifePromptTemplates';

export type IslandRunHabitSize = 'Tiny' | 'Normal' | 'Stretch';

export interface IslandRunLifeIntakeInput {
  userId: string;
  selectedHabit: SuggestedHabit;
  selectedSize: IslandRunHabitSize;
  selectedTiming: IslandRunHabitTimingChoice;
}

export interface IslandRunLifeIntakeResult {
  ok: boolean;
  habit: HabitV2Row | null;
  message: string;
}

export function buildIslandRunHabitPayload(input: {
  selectedHabit: SuggestedHabit;
  selectedSize: IslandRunHabitSize;
  selectedTiming: IslandRunHabitTimingChoice;
}) {
  const habitText =
    input.selectedSize === 'Tiny'
      ? input.selectedHabit.tinyVersion
      : input.selectedSize === 'Normal'
        ? input.selectedHabit.normalVersion
        : input.selectedHabit.stretchVersion;
  const timingSuffix = input.selectedTiming === 'Anytime' ? '' : ` (${input.selectedTiming.toLowerCase()})`;

  return {
    title: `${habitText}${timingSuffix}`,
    emoji: input.selectedHabit.emoji,
    type: 'boolean' as const,
    allow_skip: true,
    schedule: { mode: 'daily' as const },
    target_num: 1,
    target_unit: 'time' as const,
    habit_intent: 'build',
    habit_environment: [
      'Created from Island Run Habit stop',
      `Area: ${input.selectedHabit.lifeWheelArea}`,
      `Quest size: ${input.selectedSize}`,
      `Timing: ${input.selectedTiming}`,
      `Cue: ${input.selectedHabit.cueSuggestions[0] ?? 'No cue suggestion'}`,
      `Suggested habit: ${input.selectedHabit.suggestedHabitId}`,
    ].join(' · '),
  };
}

export async function createIslandRunHabitFromLifePrompt(
  input: IslandRunLifeIntakeInput,
): Promise<IslandRunLifeIntakeResult> {
  const result = await createHabitV2(
    buildIslandRunHabitPayload({
      selectedHabit: input.selectedHabit,
      selectedSize: input.selectedSize,
      selectedTiming: input.selectedTiming,
    }),
    input.userId,
  );

  if (result.error || !result.data) {
    return {
      ok: false,
      habit: null,
      message: result.error?.message ?? 'Could not create habit right now.',
    };
  }

  return {
    ok: true,
    habit: result.data,
    message: `Habit created: ${result.data.title}`,
  };
}
