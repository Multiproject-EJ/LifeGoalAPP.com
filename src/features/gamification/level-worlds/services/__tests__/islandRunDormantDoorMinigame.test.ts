import {
  buildDormantDoorMiniGame,
  DORMANT_DOOR_REWARD_LEVELS,
  resolveDormantDoorReward,
  resolveDormantDoorRewardLevels,
} from '../islandRunDormantDoorMinigame';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunDormantDoorMinigameTests: TestCase[] = [
  {
    name: 'dormant door minigame builds sixteen deterministic prize doors with three prize types',
    run: () => {
      const first = buildDormantDoorMiniGame({ islandNumber: 12, tileIndex: 6, rollIndex: 4, doorStopId: 'habit' });
      const second = buildDormantDoorMiniGame({ islandNumber: 12, tileIndex: 6, rollIndex: 4, doorStopId: 'habit' });
      assertDeepEqual(first, second, 'Expected dormant door board to be deterministic for identical inputs');
      assertEqual(first.doors.length, 16, 'Expected a 4×4 board of sixteen doors');

      const figures = new Set(first.doors.map((door) => door.figure));
      assertDeepEqual([...figures].sort(), ['large', 'medium', 'small'], 'Expected small, medium, and large prize icons');

      const counts = first.doors.reduce<Record<string, number>>((acc, door) => {
        acc[door.figure] = (acc[door.figure] ?? 0) + 1;
        return acc;
      }, {});
      assertEqual(counts.small >= 3, true, 'Expected at least three small prizes');
      assertEqual(counts.medium >= 3, true, 'Expected at least three medium prizes');
      assertEqual(counts.large >= 3, true, 'Expected at least three large prizes');
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
    name: 'dormant door reward resolves when three matching prizes are revealed',
    run: () => {
      assertEqual(resolveDormantDoorReward(['large', 'medium', 'large', 'small']), null, 'Expected no reward before three matching prizes');
      assertEqual(resolveDormantDoorReward(['large', 'medium', 'large', 'small', 'large'])?.tier, 'jackpot', 'Expected three large prizes to earn jackpot reward');
      assertEqual(resolveDormantDoorReward(['medium', 'small', 'medium', 'large', 'medium'])?.tier, 'medium', 'Expected three medium prizes to earn medium reward');
      assertEqual(resolveDormantDoorReward(['small', 'medium', 'large', 'small', 'small'])?.tier, 'small', 'Expected three small prizes to earn small reward');
    },
  },
  {
    name: 'dormant door rewards scale to 20 percent of building cost at max reward and never award dice',
    run: () => {
      const levels = resolveDormantDoorRewardLevels({ effectiveIslandNumber: 1, remainingIslandBuildCost: 1000 });
      assertEqual(levels[2].essence, 200, 'Large prize should be 20% of remaining build cost');
      assertEqual(levels[1].essence, 100, 'Medium prize should be half of the large prize');
      assertEqual(levels[0].essence, 40, 'Small prize should be 20% of the large prize');
      assertDeepEqual(levels.map((level) => level.dice), [0, 0, 0], 'Dormant door rewards should only award essence');
    },
  },
];
