import { generateTileMap, getIslandRarity } from '../islandBoardTileMap';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from '../islandRunEconomy';
import { generateIslandStopPlan } from '../islandRunStops';
import { resolveCollectibleForClaim } from '../islandRunRuntimeState';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunFoundationTests: TestCase[] = [
  {
    name: 'generateTileMap produces no stop tiles (stops are external side quests)',
    run: () => {
      const map = generateTileMap(9, getIslandRarity(9), 'forest', 0);
      assertEqual(map.length, 40, 'Expected 40 tiles on the spark40 ring');
      const stopTiles = map.filter((tile: { tileType: string }) => (tile.tileType as string) === 'stop');
      assertEqual(stopTiles.length, 0, 'Expected zero tiles with tileType="stop" — stops are off-board');
      // Every tile should be a regular feeding / hazard / encounter tile.
      // `event` tile type retired — see TILE_POOL comment in islandBoardTileMap.ts.
      const validTypes = new Set(['currency', 'chest', 'hazard', 'micro', 'encounter']);
      map.forEach((tile: { index: number; tileType: string }) => {
        assertEqual(validTypes.has(tile.tileType), true, `Tile #${tile.index} has unexpected tileType "${tile.tileType}"`);
      });
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
