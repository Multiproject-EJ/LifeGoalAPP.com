import { generateTileMap, getIslandRarity } from '../islandBoardTileMap';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from '../islandRunEconomy';
import { generateIslandStopPlan } from '../islandRunStops';
import { resolveCollectibleForClaim } from '../islandRunRuntimeState';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunFoundationTests: TestCase[] = [
  {
    name: 'generateTileMap keeps canonical stop layout intact',
    run: () => {
      const map = generateTileMap(9, getIslandRarity(9), 'forest', 0);
      assertDeepEqual(
        map.filter((tile: { tileType: string }) => tile.tileType === 'stop').map((tile: { index: number; stopId?: string }) => ({ index: tile.index, stopId: tile.stopId })),
        [
          { index: 0, stopId: 'hatchery' },
          { index: 10, stopId: 'habit' },
          { index: 20, stopId: 'mystery' },
          { index: 30, stopId: 'wisdom' },
          { index: 39, stopId: 'boss' },
        ],
        'Expected stop positions to remain canonical',
      );
    },
  },
  {
    name: 'normal-island encounter tile unlocks after day index 2',
    run: () => {
      const before = generateTileMap(3, 'normal', 'forest', 1);
      const after = generateTileMap(3, 'normal', 'forest', 2);
      assert(before[6]?.tileType !== 'encounter', 'Expected day 1 encounter to remain hidden on normal islands');
      assertEqual(after[6]?.tileType, 'encounter', 'Expected day 2 encounter tile to unlock');
    },
  },
  {
    name: 'generateIslandStopPlan always includes at least one behavior stop',
    run: () => {
      const plan = generateIslandStopPlan(12);
      assertEqual(plan.length, 5, 'Expected five canonical stops');
      assert(plan.some((stop: { isBehaviorStop: boolean }) => stop.isBehaviorStop), 'Expected at least one behavior-oriented dynamic stop');
    },
  },
  {
    name: 'ISLAND_RUN_DEFAULT_STARTING_DICE is a sane starting value',
    run: () => {
      assert(ISLAND_RUN_DEFAULT_STARTING_DICE >= 10, 'Expected starting dice to be at least 10');
      assert(ISLAND_RUN_DEFAULT_STARTING_DICE <= 200, 'Expected starting dice to be at most 200');
      assertEqual(ISLAND_RUN_DEFAULT_STARTING_DICE, 30, 'Expected default starting dice to be 30');
    },
  },
  {
    name: 'resolveCollectibleForClaim cycles through the collectible roster',
    run: () => {
      const first = resolveCollectibleForClaim(0);
      const wrapped = resolveCollectibleForClaim(7);
      assertEqual(first.name, wrapped.name, 'Expected collectible roster to wrap every 7 claims');
    },
  },
];
