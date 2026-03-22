import {
  ensureStopCompleted,
  getCompletedStopsForIsland,
  shouldAutoOpenIslandStopOnLoad,
} from '../islandRunStopCompletion';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunStopCompletionTests: TestCase[] = [
  {
    name: 'ensureStopCompleted appends missing stop ids only once',
    run: () => {
      const first = ensureStopCompleted(['minigame'], 'hatchery');
      const second = ensureStopCompleted(first, 'hatchery');
      assertDeepEqual(first, ['minigame', 'hatchery'], 'Expected missing stop id to be appended');
      assertDeepEqual(second, ['minigame', 'hatchery'], 'Expected duplicate stop ids to be avoided');
    },
  },
  {
    name: 'getCompletedStopsForIsland returns the island-specific persisted stops',
    run: () => {
      const stops = getCompletedStopsForIsland({ '3': ['hatchery', 'utility'] }, 3);
      assertDeepEqual(stops, ['hatchery', 'utility'], 'Expected island-specific completed stops');
    },
  },
  {
    name: 'shouldAutoOpenIslandStopOnLoad blocks completed hatchery stop re-open',
    run: () => {
      assertEqual(
        shouldAutoOpenIslandStopOnLoad({
          requestedStopId: 'hatchery',
          islandNumber: 8,
          completedStopsByIsland: { '8': ['hatchery'] },
        }),
        false,
        'Expected completed hatchery stop to stay closed on load',
      );
      assertEqual(
        shouldAutoOpenIslandStopOnLoad({
          requestedStopId: 'hatchery',
          islandNumber: 8,
          completedStopsByIsland: { '8': ['minigame'] },
        }),
        true,
        'Expected incomplete hatchery stop to still auto-open when requested',
      );
    },
  },
];
