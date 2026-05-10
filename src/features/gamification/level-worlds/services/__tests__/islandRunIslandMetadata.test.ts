import {
  getIslandRunIslandMetadata,
  getIslandRunRarity,
  isLuckyRollIsland,
} from '../islandRunIslandMetadata';
import { getIslandRarity } from '../islandBoardTileMap';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunIslandMetadataTests: TestCase[] = [
  {
    name: 'normal island metadata is non-special and does not trigger Lucky Roll',
    run: () => {
      const metadata = getIslandRunIslandMetadata(1);
      assertEqual(metadata.islandNumber, 1, 'Expected island number to be preserved');
      assertEqual(metadata.rarity, 'normal', 'Expected island 1 to be normal');
      assertEqual(metadata.isSpecial, false, 'Expected island 1 to be non-special');
      assertEqual(metadata.isMilestone, false, 'Expected island 1 to be non-milestone');
      assertEqual(metadata.luckyRollTrigger, 'none', 'Expected normal islands not to trigger Lucky Roll');
      assertEqual(metadata.luckyRollConfigId, undefined, 'Expected no Lucky Roll config for normal islands');
    },
  },
  {
    name: 'seasonal special island metadata preserves existing schedule',
    run: () => {
      const metadata = getIslandRunIslandMetadata(12);
      assertEqual(metadata.rarity, 'seasonal', 'Expected island 12 to remain seasonal');
      assertEqual(metadata.isSpecial, true, 'Expected island 12 to be special');
      assertEqual(metadata.isMilestone, false, 'Expected island 12 not to be a 10-island milestone');
      assertEqual(metadata.luckyRollTrigger, 'none', 'Expected seasonal islands not to trigger Lucky Roll in v1');
    },
  },
  {
    name: 'rare island metadata triggers pre-island Lucky Roll',
    run: () => {
      const metadata = getIslandRunIslandMetadata(60);
      assertEqual(metadata.rarity, 'rare', 'Expected island 60 to remain rare');
      assertEqual(metadata.isSpecial, true, 'Expected island 60 to be special');
      assertEqual(metadata.isMilestone, true, 'Expected island 60 to be a 10-island milestone');
      assertEqual(metadata.luckyRollTrigger, 'pre_island', 'Expected rare islands to trigger Lucky Roll in v1');
      assertEqual(metadata.luckyRollConfigId, 'rare_island_pre_island_v1', 'Expected rare Lucky Roll config id');
    },
  },
  {
    name: 'milestone detection is separate from current rare schedule',
    run: () => {
      const metadata = getIslandRunIslandMetadata(10);
      assertEqual(metadata.rarity, 'normal', 'Expected island 10 to preserve current rarity behavior');
      assertEqual(metadata.isSpecial, false, 'Expected island 10 not to be special under current schedule');
      assertEqual(metadata.isMilestone, true, 'Expected island 10 to be identified as a milestone');
      assertEqual(metadata.luckyRollTrigger, 'none', 'Expected island 10 not to trigger Lucky Roll until schedule is resolved');
    },
  },
  {
    name: 'Lucky Roll helper only flags intended rare islands',
    run: () => {
      assertEqual(isLuckyRollIsland(60), true, 'Expected rare island 60 to be a Lucky Roll island');
      assertEqual(isLuckyRollIsland(12), false, 'Expected seasonal island 12 not to be a Lucky Roll island');
      assertEqual(isLuckyRollIsland(10), false, 'Expected current normal milestone island 10 not to be a Lucky Roll island');
    },
  },
  {
    name: 'invalid and edge island numbers normalize safely',
    run: () => {
      const zero = getIslandRunIslandMetadata(0);
      const fractional = getIslandRunIslandMetadata(12.9);
      const infinite = getIslandRunIslandMetadata(Number.POSITIVE_INFINITY);
      assertEqual(zero.islandNumber, 1, 'Expected zero to normalize to island 1');
      assertEqual(zero.rarity, 'normal', 'Expected normalized zero to be normal');
      assertEqual(fractional.islandNumber, 12, 'Expected fractional island number to floor');
      assertEqual(fractional.rarity, 'seasonal', 'Expected floored seasonal island to classify correctly');
      assertEqual(infinite.islandNumber, 1, 'Expected non-finite island number to normalize to island 1');
      assertEqual(infinite.luckyRollTrigger, 'none', 'Expected non-finite island number not to trigger Lucky Roll');
    },
  },
  {
    name: 'existing getIslandRarity behavior maps to metadata service',
    run: () => {
      assertEqual(getIslandRunRarity(10), 'normal', 'Expected new rarity helper to preserve island 10 behavior');
      assertEqual(getIslandRarity(10), getIslandRunRarity(10), 'Expected legacy tile-map rarity wrapper to match metadata service');
      assertEqual(getIslandRarity(12), getIslandRunRarity(12), 'Expected seasonal mapping to match');
      assertEqual(getIslandRarity(60), getIslandRunRarity(60), 'Expected rare mapping to match');
    },
  },
];
