import {
  ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE,
  ISLAND_RUN_LUCKY_ROLL_FINISH_TILE,
  ISLAND_RUN_LUCKY_ROLL_MAX_DICE_REWARD,
  canResolveIslandRunLuckyRollBoardForPostRareIsland,
  getIslandRunLuckyRollBoardConfig,
  getIslandRunLuckyRollBoardSize,
  getIslandRunLuckyRollFinishTile,
  resolveIslandRunLuckyRollMove,
  resolveIslandRunLuckyRollTileReward,
  type IslandRunLuckyRollRewardCategory,
} from '../islandRunLuckyRollBoardConfig';
import { getPostRareLuckyRollMetadata, isPostRareLuckyRollIsland } from '../islandRunIslandMetadata';
import { assert, assertEqual, type TestCase } from './testHarness';

function getRewardCategoryCounts(): Record<IslandRunLuckyRollRewardCategory, number> {
  const counts: Record<IslandRunLuckyRollRewardCategory, number> = {
    essence: 0,
    shards: 0,
    dice: 0,
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
      assertPercentInRange(counts.empty, total, 0.20, 0.25, 'Empty/cozy');
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
    name: 'shard rewards exist but are marked for a follow-up banking service update',
    run: () => {
      const shardRewards = getIslandRunLuckyRollBoardConfig().tiles.flatMap((tile) => resolveIslandRunLuckyRollTileReward(tile.tileId, { islandNumber: 60 })?.rewards ?? [])
        .filter((reward) => reward.type === 'shards');
      assert(shardRewards.length > 0, 'Expected shard rewards in config');
      for (const reward of shardRewards) {
        assertEqual(reward.bankingStatus, 'requires_service_update', 'Shard reward banking should not be treated as supported yet');
        assert(Boolean(reward.bankingNote), 'Shard rewards should carry the service update note');
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
    name: 'post-rare island examples can resolve board config',
    run: () => {
      for (const islandNumber of [30, 60, 90, 120]) {
        assertEqual(isPostRareLuckyRollIsland(islandNumber), true, `Island ${islandNumber} should be post-rare Lucky Roll eligible`);
        assert(getPostRareLuckyRollMetadata(islandNumber), `Island ${islandNumber} should have post-rare metadata`);
        assertEqual(canResolveIslandRunLuckyRollBoardForPostRareIsland(islandNumber), true, `Island ${islandNumber} should resolve Lucky Roll board config`);
      }
      assertEqual(canResolveIslandRunLuckyRollBoardForPostRareIsland(12), false, 'Seasonal island 12 should not resolve as post-rare Lucky Roll');
    },
  },
];
