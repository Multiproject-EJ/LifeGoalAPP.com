import {
  buildDormantDoorMiniGame,
  DORMANT_DOOR_REWARD_LEVELS,
  resolveDormantDoorReward,
} from '../islandRunDormantDoorMinigame';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunDormantDoorMinigameTests: TestCase[] = [
  {
    name: 'dormant door minigame builds six deterministic doors with a triple, pair, and odd figure',
    run: () => {
      const first = buildDormantDoorMiniGame({ islandNumber: 12, tileIndex: 6, rollIndex: 4, doorStopId: 'habit' });
      const second = buildDormantDoorMiniGame({ islandNumber: 12, tileIndex: 6, rollIndex: 4, doorStopId: 'habit' });
      assertDeepEqual(first, second, 'Expected dormant door board to be deterministic for identical inputs');
      assertEqual(first.doors.length, 6, 'Expected six doors');

      const counts = new Map<string, number>();
      for (const door of first.doors) counts.set(door.figure, (counts.get(door.figure) ?? 0) + 1);
      assertDeepEqual([...counts.values()].sort((a, b) => b - a), [3, 2, 1], 'Expected one triple, one pair, and one odd figure');
    },
  },
  {
    name: 'dormant door minigame exposes three reward levels',
    run: () => {
      assertDeepEqual(
        DORMANT_DOOR_REWARD_LEVELS.map((level) => level.tier),
        ['small', 'medium', 'jackpot'],
        'Expected small, medium, and jackpot reward levels',
      );
    },
  },
  {
    name: 'dormant door reward resolves by best match count',
    run: () => {
      assertEqual(resolveDormantDoorReward(['shell', 'starfish', 'pearl']).tier, 'small', 'Expected all-different picks to earn small reward');
      assertEqual(resolveDormantDoorReward(['shell', 'shell', 'pearl']).tier, 'medium', 'Expected pair picks to earn medium reward');
      assertEqual(resolveDormantDoorReward(['shell', 'shell', 'shell']).tier, 'jackpot', 'Expected triple picks to earn jackpot reward');
    },
  },
];
