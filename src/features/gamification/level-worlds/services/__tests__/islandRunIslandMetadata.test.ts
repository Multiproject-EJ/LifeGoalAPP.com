import {
  getPostRareLuckyRollMetadata,
  getTreasurePathMilestoneMetadata,
  getIslandRunIslandMetadata,
  getIslandRunRarity,
  isPostRareLuckyRollIsland,
  isLuckyRollIsland,
  isTreasurePathMilestoneIsland,
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
      assertEqual(metadata.postRareLuckyRollTrigger, 'none', 'Expected normal islands not to trigger post-rare Lucky Roll');
      assertEqual(metadata.postRareLuckyRollConfigId, undefined, 'Expected no post-rare Lucky Roll config for normal islands');
      assertEqual(metadata.treasurePathMilestoneTrigger, 'none', 'Expected normal islands not to trigger Treasure Path');
      assertEqual(metadata.treasurePathMilestoneTier, undefined, 'Expected no Treasure Path tier for normal islands');
      assertEqual(metadata.treasurePathMilestoneConfigId, undefined, 'Expected no Treasure Path config for normal islands');
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
      assertEqual(metadata.postRareLuckyRollTrigger, 'none', 'Expected seasonal islands not to trigger post-rare Lucky Roll');
      assertEqual(getPostRareLuckyRollMetadata(12), null, 'Expected no post-rare metadata for seasonal islands');
      assertEqual(metadata.treasurePathMilestoneTrigger, 'none', 'Expected island 12 not to trigger Treasure Path');
      assertEqual(getTreasurePathMilestoneMetadata(12), null, 'Expected no Treasure Path metadata for island 12');
    },
  },
  {
    name: 'rare island metadata preserves dormant pre-island trigger and declares post-rare Lucky Roll',
    run: () => {
      const metadata = getIslandRunIslandMetadata(60);
      assertEqual(metadata.rarity, 'rare', 'Expected island 60 to remain rare');
      assertEqual(metadata.isSpecial, true, 'Expected island 60 to be special');
      assertEqual(metadata.isMilestone, true, 'Expected island 60 to be a 10-island milestone');
      assertEqual(metadata.luckyRollTrigger, 'pre_island', 'Expected rare islands to trigger Lucky Roll in v1');
      assertEqual(metadata.luckyRollConfigId, 'rare_island_pre_island_v1', 'Expected rare Lucky Roll config id');
      assertEqual(metadata.postRareLuckyRollTrigger, 'post_rare_completion', 'Expected rare islands to declare post-rare Lucky Roll');
      assertEqual(
        metadata.postRareLuckyRollConfigId,
        'rare_island_post_rare_completion_v1',
        'Expected rare post-rare Lucky Roll config id',
      );
      assertEqual(
        metadata.treasurePathMilestoneTrigger,
        'post_island_milestone_completion',
        'Expected rare island 60 to declare milestone Treasure Path',
      );
      assertEqual(metadata.treasurePathMilestoneTier, 'rare', 'Expected rare island 60 Treasure Path tier');
    },
  },
  {
    name: 'Treasure Path milestone metadata includes intro early and rare tiers',
    run: () => {
      const expected = new Map<number, 'intro' | 'early' | 'rare'>([
        [5, 'intro'],
        [20, 'early'],
        [30, 'rare'],
        [60, 'rare'],
        [90, 'rare'],
        [120, 'rare'],
      ]);
      for (const [islandNumber, tier] of expected) {
        assertEqual(
          isTreasurePathMilestoneIsland(islandNumber),
          true,
          `Expected island ${islandNumber} to be Treasure Path eligible`,
        );
        const metadata = getTreasurePathMilestoneMetadata(islandNumber);
        assertEqual(metadata?.islandNumber, islandNumber, `Expected Treasure Path metadata for island ${islandNumber}`);
        assertEqual(metadata?.tier, tier, `Expected Treasure Path tier for island ${islandNumber}`);
        assertEqual(
          metadata?.trigger,
          'post_island_milestone_completion',
          `Expected Treasure Path trigger for island ${islandNumber}`,
        );
        assertEqual(
          metadata?.configId,
          'treasure_path_post_island_milestone_v1',
          `Expected Treasure Path config for island ${islandNumber}`,
        );
      }
    },
  },
  {
    name: 'post-rare Lucky Roll helper flags current runtime rare islands only',
    run: () => {
      for (const islandNumber of [30, 60, 90, 120]) {
        assertEqual(
          isPostRareLuckyRollIsland(islandNumber),
          true,
          `Expected island ${islandNumber} to be a post-rare Lucky Roll island`,
        );
        const metadata = getPostRareLuckyRollMetadata(islandNumber);
        assertEqual(metadata?.islandNumber, islandNumber, `Expected post-rare metadata for island ${islandNumber}`);
        assertEqual(metadata?.rarity, 'rare', `Expected post-rare metadata for island ${islandNumber} to be rare`);
        assertEqual(
          metadata?.trigger,
          'post_rare_completion',
          `Expected post-rare trigger for island ${islandNumber}`,
        );
        assertEqual(
          metadata?.configId,
          'rare_island_post_rare_completion_v1',
          `Expected post-rare config for island ${islandNumber}`,
        );
      }
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
      assertEqual(metadata.postRareLuckyRollTrigger, 'none', 'Expected island 10 not to trigger post-rare Lucky Roll');
      assertEqual(isPostRareLuckyRollIsland(10), false, 'Expected island 10 not to be a post-rare Lucky Roll island');
      assertEqual(getPostRareLuckyRollMetadata(10), null, 'Expected island 10 to have no post-rare metadata');
      assertEqual(isTreasurePathMilestoneIsland(10), false, 'Expected island 10 not to be Treasure Path eligible');
      assertEqual(getTreasurePathMilestoneMetadata(10), null, 'Expected island 10 to have no Treasure Path metadata');
    },
  },
  {
    name: 'normal non-milestone islands are not Treasure Path eligible',
    run: () => {
      for (const islandNumber of [1, 2, 11, 31, 61, 119]) {
        assertEqual(
          isTreasurePathMilestoneIsland(islandNumber),
          false,
          `Expected island ${islandNumber} not to be Treasure Path eligible`,
        );
        assertEqual(
          getTreasurePathMilestoneMetadata(islandNumber),
          null,
          `Expected island ${islandNumber} to have no Treasure Path metadata`,
        );
      }
    },
  },
  {
    name: 'Lucky Roll helper only flags intended rare islands',
    run: () => {
      assertEqual(isLuckyRollIsland(60), true, 'Expected rare island 60 to be a Lucky Roll island');
      assertEqual(isLuckyRollIsland(12), false, 'Expected seasonal island 12 not to be a Lucky Roll island');
      assertEqual(isLuckyRollIsland(10), false, 'Expected current normal milestone island 10 not to be a Lucky Roll island');
      assertEqual(isPostRareLuckyRollIsland(60), true, 'Expected rare island 60 to be a post-rare Lucky Roll island');
      assertEqual(isPostRareLuckyRollIsland(12), false, 'Expected seasonal island 12 not to be a post-rare Lucky Roll island');
      assertEqual(isPostRareLuckyRollIsland(1), false, 'Expected normal island 1 not to be a post-rare Lucky Roll island');
      assertEqual(isTreasurePathMilestoneIsland(5), true, 'Expected intro milestone island 5 to be Treasure Path eligible');
      assertEqual(isTreasurePathMilestoneIsland(20), true, 'Expected early milestone island 20 to be Treasure Path eligible');
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
      assertEqual(infinite.postRareLuckyRollTrigger, 'none', 'Expected non-finite island number not to trigger post-rare Lucky Roll');
      assertEqual(infinite.treasurePathMilestoneTrigger, 'none', 'Expected non-finite island number not to trigger Treasure Path');
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
