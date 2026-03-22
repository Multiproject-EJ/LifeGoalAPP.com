import { getNextIslandOnExpiry, getRequiredStopIdsForIsland, isIslandFullyCleared } from '../islandRunProgression';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunProgressionTests: TestCase[] = [
  {
    name: 'getRequiredStopIdsForIsland returns all canonical stop ids',
    run: () => {
      assertDeepEqual(
        getRequiredStopIdsForIsland(9),
        ['hatchery', 'minigame', 'utility', 'dynamic', 'boss'],
        'Expected progression gating to require every canonical stop',
      );
    },
  },
  {
    name: 'isIslandFullyCleared requires all stop ids including boss',
    run: () => {
      assertEqual(isIslandFullyCleared(9, ['hatchery', 'minigame', 'utility', 'dynamic']), false, 'Expected missing boss stop to block completion');
      assertEqual(isIslandFullyCleared(9, ['hatchery', 'minigame', 'utility', 'dynamic', 'boss']), true, 'Expected all stops to count as a full clear');
    },
  },
  {
    name: 'getNextIslandOnExpiry only advances after a full clear',
    run: () => {
      assertEqual(getNextIslandOnExpiry(12, ['hatchery', 'minigame', 'utility', 'dynamic']), 12, 'Expected incomplete island expiry to retry the same island');
      assertEqual(getNextIslandOnExpiry(12, ['hatchery', 'minigame', 'utility', 'dynamic', 'boss']), 13, 'Expected cleared island expiry to advance to the next island');
    },
  },
];
