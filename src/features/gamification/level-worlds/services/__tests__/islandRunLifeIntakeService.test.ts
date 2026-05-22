import { getSuggestedHabitById } from '../../../../habits/suggestedHabitLibrary';
import { buildIslandRunHabitPayload } from '../islandRunLifeIntakeService';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunLifeIntakeServiceTests: TestCase[] = [
  {
    name: 'maps Tiny variant and timing into createHabitV2 payload',
    run: () => {
      const sampleHabit = getSuggestedHabitById('health-water-glass');
      assert(!!sampleHabit, 'Expected sample habit to exist');
      const payload = buildIslandRunHabitPayload({
        selectedHabit: sampleHabit!,
        selectedSize: 'Tiny',
        selectedTiming: 'Morning',
      });

      assertEqual(payload.title, 'Drink 4 sips of water. (morning)', 'Uses tiny variant with timing suffix');
      assertEqual(payload.emoji, '💧', 'Uses selected habit emoji');
      assert(payload.habit_intent.includes('Health'), 'Habit intent includes area');
      assert(payload.habit_environment.includes('Quest size: Tiny'), 'Environment records quest size');
      assert(payload.habit_environment.includes('Timing: Morning'), 'Environment records selected timing');
    },
  },
  {
    name: 'uses Anytime without suffix and maps Stretch variant',
    run: () => {
      const sampleHabit = getSuggestedHabitById('health-water-glass');
      assert(!!sampleHabit, 'Expected sample habit to exist');
      const payload = buildIslandRunHabitPayload({
        selectedHabit: sampleHabit!,
        selectedSize: 'Stretch',
        selectedTiming: 'Anytime',
      });

      assertEqual(payload.title, 'Drink two full glasses of water.', 'Uses stretch variant with no anytime suffix');
      assert(payload.habit_environment.includes('Timing: Anytime'), 'Environment records anytime timing');
    },
  },
];
