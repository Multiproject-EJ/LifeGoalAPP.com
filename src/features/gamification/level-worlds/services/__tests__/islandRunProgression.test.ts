import { getNextIslandOnExpiry, getRequiredStopIdsForIsland, isIslandFullyCleared } from '../islandRunProgression';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunProgressionTests: TestCase[] = [
  {
    name: 'getRequiredStopIdsForIsland returns all canonical stop ids',
    run: () => {
      assertDeepEqual(
        getRequiredStopIdsForIsland(9),
        ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'],
        'Expected progression gating to require every canonical stop',
      );
    },
  },
  {
    name: 'isIslandFullyCleared requires all stop ids including boss',
    run: () => {
      assertEqual(isIslandFullyCleared(9, ['hatchery', 'habit', 'mystery', 'wisdom']), false, 'Expected missing boss stop to block completion');
      assertEqual(isIslandFullyCleared(9, ['hatchery', 'habit', 'mystery', 'wisdom', 'boss']), true, 'Expected all stops to count as a full clear');
    },
  },
  {
    name: 'getNextIslandOnExpiry always advances to the next island',
    run: () => {
      assertEqual(getNextIslandOnExpiry(12, ['hatchery', 'habit', 'mystery', 'wisdom']), 13, 'Expected incomplete island expiry to unlock the next island');
      assertEqual(getNextIslandOnExpiry(12, ['hatchery', 'habit', 'mystery', 'wisdom', 'boss']), 13, 'Expected cleared island expiry to advance to the next island');
    },
  },
];
