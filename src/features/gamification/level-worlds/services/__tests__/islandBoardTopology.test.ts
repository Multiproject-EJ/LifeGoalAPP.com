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
      assertEqual(resolveWrappedTokenIndex(58, 3, 60), 1, 'Expected 60-tile topology to wrap 58 + 3 -> 1');
    },
  },
  {
    name: 'v2 stop progression remains strict sequential and independent of board tile indices',
    run: () => {
      const stopPlan = generateIslandStopPlan(7, { profileId: 'spark60_preview' });
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
    name: 'default board profile still resolves to current 17-tile behavior',
    run: () => {
      const defaultProfile = resolveIslandBoardProfile();
      assertEqual(defaultProfile.id, 'legacy17', 'Expected legacy17 as the default active profile');
      assertEqual(defaultProfile.tileCount, 17, 'Expected 17 tiles for the default profile');

      const tileMap = generateTileMap(3, 'normal', 'forest', 0);
      assertEqual(tileMap.length, 17, 'Expected generated tile map length to remain 17 in default profile');
    },
  },
  {
    name: 'future spark preview profile resolves safely but remains dormant until selected',
    run: () => {
      const previewProfile = resolveIslandBoardProfile('spark60_preview');
      assertEqual(previewProfile.tileCount, 60, 'Expected preview profile to expose 60-tile topology');

      const previewTileMap = generateTileMap(3, 'normal', 'forest', 0, { profileId: 'spark60_preview' });
      assertEqual(previewTileMap.length, 60, 'Expected preview tile map generation to support 60 tiles');
    },
  },
];
