import { assert, assertEqual, type TestCase } from './testHarness';
import { resolveIslandRunFeatureAccess } from '../islandRunFeatureAccess';
import { createOpeningGamesCampaignLedger } from '../islandRunSignatureMissions';
import { generateTileMap, getIslandRarity } from '../islandBoardTileMap';
import { TRAFFIC_LIGHT_TILE_INDEX, resolveTrafficLightExcitement } from '../islandRunTrafficLightTile';

export const trafficLightIntroductionTests: TestCase[] = [
  {
    name: 'traffic light: introduced on Island 003 for every save, never on 001/002',
    run: () => {
      for (const ledger of [undefined, createOpeningGamesCampaignLedger()]) {
        for (const island of [1, 2]) {
          assert(!resolveIslandRunFeatureAccess({ currentIslandNumber: island, signatureMissionProgressByIsland: ledger }).trafficLight, `no traffic light on Island ${island}`);
          const tiles = generateTileMap(island, getIslandRarity(island), 'forest', 0, { signatureMissionProgressByIsland: ledger });
          assert(!tiles.some((tile) => tile.tileType === 'traffic_light'), `no traffic-light tile on Island ${island}`);
        }
        for (const island of [3, 4, 50]) {
          assert(resolveIslandRunFeatureAccess({ currentIslandNumber: island, signatureMissionProgressByIsland: ledger }).trafficLight, `traffic light on Island ${island}`);
        }
        const islandThree = generateTileMap(3, getIslandRarity(3), 'forest', 0, { signatureMissionProgressByIsland: ledger });
        assertEqual(islandThree.find((tile) => tile.index === TRAFFIC_LIGHT_TILE_INDEX)?.tileType, 'traffic_light', 'its tile on Island 003');
      }
    },
  },
  {
    name: 'traffic light: glows in excitement with two lamps (laps) left',
    run: () => {
      for (const lit of [0, 3, 5]) assertEqual(resolveTrafficLightExcitement(lit), 0, `${lit} lit: calm`);
      assertEqual(resolveTrafficLightExcitement(6), 0.6, 'two left: glowing');
      assertEqual(resolveTrafficLightExcitement(7), 1, 'one left: full excitement');
      assertEqual(resolveTrafficLightExcitement(8), 0, 'complete: the bonus takes over');
      assertEqual(resolveTrafficLightExcitement(Number.NaN), 0, 'invalid input is calm');
    },
  },
];
