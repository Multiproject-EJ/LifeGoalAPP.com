import {
  ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE,
  ISLAND_RUN_LUCKY_ROLL_FINISH_TILE,
  ISLAND_RUN_LUCKY_ROLL_MAX_DICE_REWARD,
  canResolveIslandRunLuckyRollBoardForPostRareIsland,
  canResolveIslandRunLuckyRollBoardForTreasurePathMilestoneIsland,
  getIslandRunLuckyRollBoardConfig,
  getIslandRunLuckyRollBoardSize,
  getIslandRunLuckyRollFinishTile,
  getTreasurePathRewardTierForIsland,
  resolveIslandRunLuckyRollMove,
  resolveIslandRunLuckyRollTileReward,
  type IslandRunLuckyRollRewardCategory,
} from '../islandRunLuckyRollBoardConfig';
import {
  getPostRareLuckyRollMetadata,
  getTreasurePathMilestoneMetadata,
  isPostRareLuckyRollIsland,
  isTreasurePathMilestoneIsland,
} from '../islandRunIslandMetadata';
import { assert, assertEqual, type TestCase } from './testHarness';

function getRewardCategoryCounts(): Record<IslandRunLuckyRollRewardCategory, number> {
  const counts: Record<IslandRunLuckyRollRewardCategory, number> = {
    essence: 0,
    shards: 0,
    dice: 0,
    egg: 0,
    empty: 0,
  };
  for (const tile of getIslandRunLuckyRollBoardConfig().tiles) {
    counts[tile.rewardCategory] += 1;
  }
  return counts;
}

function assertPercentInRange(count: number, total: number, min: number, max: number, label: string): void {
  const percent = count / total;
  assert(percent >= min && percent <= max, `${label} mix ${percent} outside ${min}-${max}`);
}

function sumResolvedRewards(type: 'essence' | 'dice' | 'shards', islandNumber: number): number {
  return getIslandRunLuckyRollBoardConfig({ islandNumber }).tiles.reduce((total, tile) => {
    const resolved = resolveIslandRunLuckyRollTileReward(tile.tileId, { islandNumber, cycleIndex: 0 });
    return total + (resolved?.rewards ?? [])
      .filter((reward) => reward.type === type)
      .reduce((rewardTotal, reward) => rewardTotal + reward.amount, 0);
  }, 0);
}

function getResolvedEggRewards(islandNumber: number): number[] {
  return getIslandRunLuckyRollBoardConfig({ islandNumber }).tiles.flatMap((tile) => (
    resolveIslandRunLuckyRollTileReward(tile.tileId, { islandNumber, cycleIndex: 0 })?.rewards ?? []
  ).filter((reward) => reward.type === 'egg').map((reward) => reward.amount));
}

export const islandRunLuckyRollBoardConfigTests: TestCase[] = [
  {
    name: 'production board has exactly 30 contiguous tiles',
    run: () => {
      const config = getIslandRunLuckyRollBoardConfig();
      assertEqual(config.boardSize, ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE, 'Board config should report size 30');
      assertEqual(getIslandRunLuckyRollBoardSize(), ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE, 'Board size helper should report size 30');
      assertEqual(config.tiles.length, 30, 'Board should expose exactly 30 tiles');
      config.tiles.forEach((tile, index) => {
        assertEqual(tile.tileId, index, `Tile ${index} should be contiguous`);
      });
    },
  },
  {
    name: 'finish tile is index 29 and ends on land-or-pass',
    run: () => {
      const config = getIslandRunLuckyRollBoardConfig();
      const finishTile = config.tiles[ISLAND_RUN_LUCKY_ROLL_FINISH_TILE];
      assertEqual(config.finishTileId, 29, 'Finish tile id should be 29');
      assertEqual(getIslandRunLuckyRollFinishTile(), 29, 'Finish helper should return 29');
      assertEqual(finishTile.kind, 'finish', 'Tile 29 should be the finish tile');
      assertEqual(config.endsWhenPositionAtOrBeyondTileId, 29, 'Landing on or passing tile 29 should end Lucky Roll');
    },
  },
  {
    name: 'reward mix is within production v1 target ranges',
    run: () => {
      const counts = getRewardCategoryCounts();
      const total = getIslandRunLuckyRollBoardConfig().tiles.length;
      assertPercentInRange(counts.essence, total, 0.45, 0.55, 'Essence');
      assertPercentInRange(counts.shards, total, 0.15, 0.20, 'Shard');
      assertPercentInRange(counts.dice, total, 0.10, 0.15, 'Dice');
      assertPercentInRange(counts.egg, total, 0.10, 0.10, 'Egg');
      assertPercentInRange(counts.empty, total, 0.10, 0.10, 'Empty/cozy');
    },
  },
  {
    name: 'production board has exactly 3 Treasure Egg fields',
    run: () => {
      const eggTiles = getIslandRunLuckyRollBoardConfig().tiles.filter((tile) => tile.kind === 'egg');
      assertEqual(eggTiles.length, 3, 'Board should expose exactly 3 egg fields');
      for (const tile of eggTiles) {
        assertEqual(tile.rewardCategory, 'egg', `Tile ${tile.tileId} should be categorized as egg`);
        assertEqual(tile.label, 'Treasure Egg', `Tile ${tile.tileId} should use Treasure Egg copy`);
        assert(tile.copy.includes('egg field') || tile.copy.includes('treasure field'), `Tile ${tile.tileId} should use egg field or treasure field copy`);
        assert(tile.copy.includes('found an egg'), `Tile ${tile.tileId} should say the player found an egg`);
      }
    },
  },
  {
    name: 'board includes empty cozy sparkle tiles',
    run: () => {
      const emptyTiles = getIslandRunLuckyRollBoardConfig().tiles.filter((tile) => tile.rewardCategory === 'empty');
      assert(emptyTiles.length > 0, 'Expected empty/cozy/sparkle tiles');
      assert(emptyTiles.some((tile) => tile.kind === 'empty'), 'Expected explicitly empty cozy tiles');
      assert(emptyTiles.some((tile) => tile.copy.includes('cozy') || tile.copy.includes('sparkle')), 'Expected cozy/sparkle copy');
    },
  },
  {
    name: 'board includes positive backward bonus detour tiles',
    run: () => {
      const detours = getIslandRunLuckyRollBoardConfig().tiles.filter((tile) => tile.kind === 'bonus_detour');
      assert(detours.length > 0, 'Expected bonus detour tiles');
      for (const detour of detours) {
        assert((detour.moveDelta ?? 0) < 0, `Detour tile ${detour.tileId} should move backward`);
        assert(detour.copy.includes('joyful') || detour.copy.includes('scenic') || detour.copy.includes('happy'), `Detour tile ${detour.tileId} should use positive copy`);
        const resolved = resolveIslandRunLuckyRollMove(detour.tileId, { currentPosition: detour.tileId });
        assertEqual(resolved?.isBonusDetour, true, `Detour tile ${detour.tileId} should resolve as a bonus detour`);
        assert((resolved?.destinationTileId ?? detour.tileId) < detour.tileId, `Detour tile ${detour.tileId} should resolve backward movement`);
      }
    },
  },
  {
    name: 'essence rewards scale upward with island progression',
    run: () => {
      const earlyTotal = sumResolvedRewards('essence', 30);
      const lateTotal = sumResolvedRewards('essence', 90);
      assert(lateTotal > earlyTotal, `Expected island 90 essence ${lateTotal} to exceed island 30 essence ${earlyTotal}`);
    },
  },
  {
    name: 'dice rewards stay bounded',
    run: () => {
      const diceRewards = getIslandRunLuckyRollBoardConfig().tiles.flatMap((tile) => resolveIslandRunLuckyRollTileReward(tile.tileId, { islandNumber: 60 })?.rewards ?? [])
        .filter((reward) => reward.type === 'dice');
      assert(diceRewards.length > 0, 'Expected dice rewards to exist');
      for (const reward of diceRewards) {
        assert(reward.amount <= ISLAND_RUN_LUCKY_ROLL_MAX_DICE_REWARD, `Dice reward ${reward.amount} should stay bounded`);
      }
      assert(sumResolvedRewards('dice', 60) <= 20, 'Total Lucky Roll dice payout should stay bounded for v1');
    },
  },
  {
    name: 'shard rewards exist and are bankable through the action service',
    run: () => {
      const shardRewards = getIslandRunLuckyRollBoardConfig().tiles.flatMap((tile) => resolveIslandRunLuckyRollTileReward(tile.tileId, { islandNumber: 60 })?.rewards ?? [])
        .filter((reward) => reward.type === 'shards');
      assert(shardRewards.length > 0, 'Expected shard rewards in config');
      for (const reward of shardRewards) {
        assertEqual(reward.bankingStatus, 'bankable_now', 'Shard reward banking should be supported by the action service');
      }
    },
  },
  {
    name: 'no tile has negative reward amounts',
    run: () => {
      for (const tile of getIslandRunLuckyRollBoardConfig().tiles) {
        const resolved = resolveIslandRunLuckyRollTileReward(tile.tileId, { islandNumber: 30 });
        for (const reward of resolved?.rewards ?? []) {
          assert(reward.amount >= 0, `Tile ${tile.tileId} should not resolve a negative reward`);
        }
      }
    },
  },
  {
    name: 'config does not consume the normal dicePool',
    run: () => {
      const config = getIslandRunLuckyRollBoardConfig();
      assertEqual(config.rollCostDice, 0, 'Lucky Roll rolls should be free');
      assertEqual(config.consumesNormalDicePool, false, 'Lucky Roll should not consume normal dicePool');
    },
  },
  {
    name: 'Treasure Path milestone island examples can resolve board config',
    run: () => {
      for (const islandNumber of [5, 20, 30, 60, 90, 120]) {
        assertEqual(isTreasurePathMilestoneIsland(islandNumber), true, `Island ${islandNumber} should be Treasure Path eligible`);
        assert(getTreasurePathMilestoneMetadata(islandNumber), `Island ${islandNumber} should have Treasure Path metadata`);
        assertEqual(
          canResolveIslandRunLuckyRollBoardForTreasurePathMilestoneIsland(islandNumber),
          true,
          `Island ${islandNumber} should resolve Lucky Roll board config`,
        );
      }
      for (const islandNumber of [30, 60, 90, 120]) {
        assertEqual(isPostRareLuckyRollIsland(islandNumber), true, `Island ${islandNumber} should remain post-rare Lucky Roll eligible`);
        assert(getPostRareLuckyRollMetadata(islandNumber), `Island ${islandNumber} should preserve post-rare metadata`);
      }
      assertEqual(
        canResolveIslandRunLuckyRollBoardForTreasurePathMilestoneIsland(10),
        false,
        'Island 10 should not resolve as Treasure Path eligible',
      );
      assertEqual(
        canResolveIslandRunLuckyRollBoardForTreasurePathMilestoneIsland(12),
        false,
        'Seasonal island 12 should not resolve as Treasure Path eligible',
      );
      assertEqual(
        canResolveIslandRunLuckyRollBoardForPostRareIsland(30),
        true,
        'Compatibility helper should still resolve rare Treasure Path island 30',
      );
    },
  },
  {
    name: 'Treasure Path reward tier resolves from milestone metadata',
    run: () => {
      assertEqual(getTreasurePathRewardTierForIsland(5), 'intro', 'Island 5 should resolve intro rewards');
      assertEqual(getIslandRunLuckyRollBoardConfig({ islandNumber: 5 }).rewardTier, 'intro', 'Island 5 config should expose intro reward tier');
      assertEqual(getIslandRunLuckyRollBoardConfig({ islandNumber: 5 }).milestoneTier, 'intro', 'Island 5 config should expose intro milestone tier');

      assertEqual(getTreasurePathRewardTierForIsland(20), 'early', 'Island 20 should resolve early rewards');
      assertEqual(getIslandRunLuckyRollBoardConfig({ islandNumber: 20 }).rewardTier, 'early', 'Island 20 config should expose early reward tier');
      assertEqual(getIslandRunLuckyRollBoardConfig({ islandNumber: 20 }).milestoneTier, 'early', 'Island 20 config should expose early milestone tier');

      for (const islandNumber of [30, 60, 90, 120]) {
        assertEqual(getTreasurePathRewardTierForIsland(islandNumber), 'rare', `Island ${islandNumber} should resolve rare rewards`);
        assertEqual(getIslandRunLuckyRollBoardConfig({ islandNumber }).rewardTier, 'rare', `Island ${islandNumber} config should expose rare reward tier`);
        assertEqual(getIslandRunLuckyRollBoardConfig({ islandNumber }).milestoneTier, 'rare', `Island ${islandNumber} config should expose rare milestone tier`);
      }
    },
  },
  {
    name: 'Treasure Path tier scaling increases essence from intro to early to rare',
    run: () => {
      const introTotal = sumResolvedRewards('essence', 5);
      const earlyTotal = sumResolvedRewards('essence', 20);
      const rareTotal = sumResolvedRewards('essence', 30);

      assert(introTotal < earlyTotal, `Expected intro essence ${introTotal} to be less than early ${earlyTotal}`);
      assert(earlyTotal < rareTotal, `Expected early essence ${earlyTotal} to be less than rare ${rareTotal}`);
    },
  },
  {
    name: 'Treasure Path tier scaling increases dice totals from intro to early to rare',
    run: () => {
      const introTotal = sumResolvedRewards('dice', 5);
      const earlyTotal = sumResolvedRewards('dice', 20);
      const rareTotal = sumResolvedRewards('dice', 30);

      assert(introTotal <= earlyTotal, `Expected intro dice ${introTotal} to be no more than early ${earlyTotal}`);
      assert(earlyTotal <= rareTotal, `Expected early dice ${earlyTotal} to be no more than rare ${rareTotal}`);
    },
  },
  {
    name: 'Treasure Path tier scaling increases shard totals from intro to early to rare',
    run: () => {
      const introTotal = sumResolvedRewards('shards', 5);
      const earlyTotal = sumResolvedRewards('shards', 20);
      const rareTotal = sumResolvedRewards('shards', 30);

      assert(introTotal <= earlyTotal, `Expected intro shards ${introTotal} to be no more than early ${earlyTotal}`);
      assert(earlyTotal <= rareTotal, `Expected early shards ${earlyTotal} to be no more than rare ${rareTotal}`);
    },
  },
  {
    name: 'rare Treasure Path keeps full Treasure Egg behavior',
    run: () => {
      const rareEggRewards = getResolvedEggRewards(30);

      assertEqual(rareEggRewards.length, 3, 'Rare Treasure Path should keep all 3 egg fields');
      for (const amount of rareEggRewards) {
        assertEqual(amount, 1, 'Rare Treasure Path egg fields should each grant one Treasure Egg voucher');
      }
    },
  },
  {
    name: 'non-milestone islands default to rare/base reward tier without milestone metadata',
    run: () => {
      const config = getIslandRunLuckyRollBoardConfig({ islandNumber: 10 });

      assertEqual(getTreasurePathRewardTierForIsland(10), 'rare', 'Non-milestone island should use safe rare/base reward tier fallback');
      assertEqual(config.rewardTier, 'rare', 'Non-milestone config should expose rare/base reward tier fallback');
      assertEqual(config.milestoneTier, undefined, 'Non-milestone config should not expose a milestone tier');
    },
  },
];
