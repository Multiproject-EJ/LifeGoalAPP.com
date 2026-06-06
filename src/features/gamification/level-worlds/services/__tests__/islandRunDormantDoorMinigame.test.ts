import {
  buildDormantDoorMiniGame,
  DORMANT_DOOR_REWARD_LEVELS,
  DORMANT_DOOR_WINNING_LINES,
  resolveDormantDoorReward,
  resolveDormantDoorRewardLevels,
} from '../islandRunDormantDoorMinigame';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunDormantDoorMinigameTests: TestCase[] = [
  {
    name: 'dormant door minigame builds nine deterministic prize doors with line prizes',
    run: () => {
      const first = buildDormantDoorMiniGame({ islandNumber: 12, tileIndex: 6, rollIndex: 4, doorStopId: 'habit' });
      const second = buildDormantDoorMiniGame({ islandNumber: 12, tileIndex: 6, rollIndex: 4, doorStopId: 'habit' });
      assertDeepEqual(first, second, 'Expected dormant door board to be deterministic for identical inputs');
      assertEqual(first.doors.length, 9, 'Expected a 3×3 board of nine doors');

      const figures = new Set(first.doors.map((door) => door.figure));
      assertDeepEqual([...figures].sort(), ['large', 'medium', 'small'], 'Expected small, medium, and large prize icons');

      const hasLargeLine = DORMANT_DOOR_WINNING_LINES.some((line) => line.every((index) => first.doors[index]?.figure === 'large'));
      const hasMediumLine = DORMANT_DOOR_WINNING_LINES.some((line) => line.every((index) => first.doors[index]?.figure === 'medium'));
      assertEqual(hasLargeLine, true, 'Expected one large-prize line');
      assertEqual(hasMediumLine, true, 'Expected one medium-prize line');
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
    name: 'dormant door reward resolves by completed prize line',
    run: () => {
      assertEqual(resolveDormantDoorReward(['large', 'large', 'large'], [0, 1, 2]).tier, 'jackpot', 'Expected a large completed line to earn jackpot reward');
      assertEqual(resolveDormantDoorReward(['medium', 'medium', 'medium'], [0, 1, 2]).tier, 'medium', 'Expected a medium completed line to earn medium reward');
      assertEqual(resolveDormantDoorReward(['large', 'large', 'large'], [0, 1, 3]).tier, 'small', 'Expected non-line picks to fall back to small reward');
      assertEqual(resolveDormantDoorReward(['large', 'medium', 'large'], [0, 1, 2]).tier, 'small', 'Expected mixed line icons to fall back to small reward');
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
