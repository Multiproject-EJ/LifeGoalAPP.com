import { getSuggestedHabitsByLifeWheelArea } from '../../../../habits/suggestedHabitLibrary';
import { rankSuggestedHabitsByFeedback } from '../islandRunHabitSuggestionEngine';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunHabitSuggestionEngineTests: TestCase[] = [
  {
    name: 'prioritizes tiny physical habits for low-energy under-2-min profile',
    run: () => {
      const habits = getSuggestedHabitsByLifeWheelArea('Health');
      const ranked = rankSuggestedHabitsByFeedback(habits, {
        energy: 'low',
        time: 'under_2',
        style: 'physical',
      });

      assert(ranked.length > 0, 'Expected ranked results');
      assert(ranked[0]?.difficultyTier === 'tiny', 'Expected tiny habit to rank first for low-energy profile');
    },
  },
  {
    name: 'returns deterministic ordering for same profile input',
    run: () => {
      const habits = getSuggestedHabitsByLifeWheelArea('Mind');
      const one = rankSuggestedHabitsByFeedback(habits, { energy: 'medium', time: 'two_to_five', style: 'mental' });
      const two = rankSuggestedHabitsByFeedback(habits, { energy: 'medium', time: 'two_to_five', style: 'mental' });
      assertDeepEqual(one.map((habit) => habit.suggestedHabitId), two.map((habit) => habit.suggestedHabitId), 'Ordering should be deterministic');
    },
  },
];
