import { resolveIslandBoardProfile } from '../islandBoardProfiles';
import { generateTileMap } from '../islandBoardTileMap';
import { resolveWrappedTokenIndex } from '../islandBoardTopology';
import { generateIslandStopPlan } from '../islandRunStops';
import { resolveIslandRunContractV2Stops } from '../islandRunContractV2StopResolver';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandBoardTopologyTests: TestCase[] = [
  {
    name: 'movement wrap uses profile tile count rather than hardcoded 17',
    run: () => {
      assertEqual(resolveWrappedTokenIndex(16, 1, 17), 0, 'Expected 17-tile topology to wrap 16 -> 0');
      assertEqual(resolveWrappedTokenIndex(38, 3, 40), 1, 'Expected 40-tile topology to wrap 38 + 3 -> 1');
    },
  },
  {
    name: 'v2 stop progression remains strict sequential and independent of board tile indices',
    run: () => {
      const stopPlan = generateIslandStopPlan(7, { profileId: 'spark40_ring' });
      assertEqual(stopPlan.length, 5, 'Expected five-stop plan regardless of board size');

      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
      });

      assertEqual(result.activeStopIndex, 1, 'Expected second stop to be active after first completion');
      assertDeepEqual(result.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Expected index-sequential v2 statuses');
    },
  },
  {
    name: 'default board profile resolves to spark40_ring topology',
    run: () => {
      const defaultProfile = resolveIslandBoardProfile();
      assertEqual(defaultProfile.id, 'spark40_ring', 'Expected spark40_ring as the default active profile');
      assertEqual(defaultProfile.tileCount, 40, 'Expected 40 tiles for the default profile');

      const tileMap = generateTileMap(3, 'normal', 'forest', 0);
      assertEqual(tileMap.length, 40, 'Expected generated tile map length to default to 40');
    },
  },
  {
    name: 'explicit spark40 ring profile resolves safely',
    run: () => {
      const previewProfile = resolveIslandBoardProfile('spark40_ring');
      assertEqual(previewProfile.tileCount, 40, 'Expected ring profile to expose 40-tile topology');

      const previewTileMap = generateTileMap(3, 'normal', 'forest', 0, { profileId: 'spark40_ring' });
      assertEqual(previewTileMap.length, 40, 'Expected ring tile map generation to support 40 tiles');
    },
  },
  {
    // P2-10 regression. `seededRandom(0)` previously returned 0 because
    // xorshift from 0 stays at 0, which caused `generateTileMap` to pick
    // `TILE_POOL[0]` (currency) for every tile — a silent degenerate board.
    // Production callers pass `islandNumber ≥ 1`, but any dev/QA path
    // that fed island 0 hit this. The fallback clamp inside seededRandom
    // (`s = (seed | 0) || 1`) restores variety.
    name: 'P2-10: seed=0 does not collapse the tile pool to a single type',
    run: () => {
      const tileMap = generateTileMap(0, 'normal', 'forest', 0);
      assertEqual(tileMap.length, 40, 'Expected 40 tiles for seed 0');
      const uniqueTypes = new Set(tileMap.map((t) => t.tileType));
      // Encounter may not appear for every island; but at minimum the four
      // base pool types should collectively produce >=3 distinct entries.
      // Anything less than 3 means the seeded RNG has collapsed.
      assertEqual(uniqueTypes.size >= 3, true, `Expected tile variety for seed 0, got types: ${[...uniqueTypes].join(', ')}`);
    },
  },
];
