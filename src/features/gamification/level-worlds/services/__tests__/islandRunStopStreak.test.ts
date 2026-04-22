import { resolveIslandClearsCount } from '../islandRunStopStreak';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunStopStreakTests: TestCase[] = [
  {
    name: 'current island incomplete: counts clears before it',
    run: () => {
      const count = resolveIslandClearsCount({
        currentIslandNumber: 7,
        cycleIndex: 0,
        isCurrentIslandFullyCleared: false,
      });
      assertEqual(count, 6, 'Expected islands 1–6 cleared, island 7 still in progress.');
    },
  },
  {
    name: 'current island fully cleared: includes current island in count',
    run: () => {
      const count = resolveIslandClearsCount({
        currentIslandNumber: 9,
        cycleIndex: 0,
        isCurrentIslandFullyCleared: true,
      });
      assertEqual(count, 9, 'Expected clear counter to include current fully-cleared island.');
    },
  },
  {
    name: 'cycle index scales clear count beyond island 120 wrap',
    run: () => {
      const count = resolveIslandClearsCount({
        currentIslandNumber: 5,
        cycleIndex: 2,
        isCurrentIslandFullyCleared: false,
      });
      assertEqual(count, 244, 'Expected 240 + 4 cleared islands when at cycle 2 island 5.');
    },
  },
];
