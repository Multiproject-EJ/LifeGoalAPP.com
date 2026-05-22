import { createHabitV2, type HabitV2Row } from '../../../../services/habitsV2';
import { buildIslandRunHabitTitle, type IslandRunHabitTimingChoice, type IslandRunLifeWheelArea } from './islandRunLifePromptTemplates';

export interface IslandRunLifeIntakeInput {
  userId: string;
  area: IslandRunLifeWheelArea;
  preset: string;
  timing: IslandRunHabitTimingChoice;
}

export interface IslandRunLifeIntakeResult {
  ok: boolean;
  habit: HabitV2Row | null;
  message: string;
}

export async function createIslandRunHabitFromLifePrompt(
  input: IslandRunLifeIntakeInput,
): Promise<IslandRunLifeIntakeResult> {
  const title = buildIslandRunHabitTitle({ area: input.area, preset: input.preset, timing: input.timing });
  const result = await createHabitV2(
    {
      title,
      emoji: '✅',
      type: 'boolean',
      allow_skip: true,
      schedule: { mode: 'daily' },
      target_num: 1,
      target_unit: 'time',
      habit_intent: `Island Run Habit stop (${input.area})`,
      habit_environment: `Created from Island Run Habit stop · ${input.area} · ${input.timing}`,
    },
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
