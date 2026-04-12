import { generateTileMap, getIslandRarity } from '../islandBoardTileMap';
import { getDicePerHeartForIsland } from '../islandRunEconomy';
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
          { index: 10, stopId: 'minigame' },
          { index: 20, stopId: 'market' },
          { index: 30, stopId: 'utility' },
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
    name: 'getDicePerHeartForIsland follows configured conversion tiers',
    run: () => {
      assertEqual(getDicePerHeartForIsland(1), 20, 'Expected island 1 base conversion');
      assertEqual(getDicePerHeartForIsland(5), 30, 'Expected island 5 conversion tier');
      assertEqual(getDicePerHeartForIsland(15), 50, 'Expected island 15 conversion tier');
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
