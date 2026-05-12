import {
  getEffectiveIslandNumber,
  getIslandTotalEssenceCost,
} from './islandRunContractV2EssenceBuild';
import {
  getTreasurePathMilestoneMetadata,
  type IslandRunTreasurePathMilestoneTier,
} from './islandRunIslandMetadata';

export const ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE = 30;
export const ISLAND_RUN_LUCKY_ROLL_FINISH_TILE = 29;
export const ISLAND_RUN_LUCKY_ROLL_ESSENCE_PAYOUT_RATIOS_BY_TIER: Record<IslandRunTreasurePathMilestoneTier, number> = {
  intro: 0.04,
  early: 0.07,
  rare: 0.1,
};
export const ISLAND_RUN_LUCKY_ROLL_MAX_DICE_REWARD = 5;

export type IslandRunLuckyRollTileKind = 'essence' | 'dice' | 'shards' | 'egg' | 'empty' | 'finish' | 'bonus_detour';
export type IslandRunLuckyRollRewardType = 'essence' | 'dice' | 'shards' | 'egg';
export type IslandRunLuckyRollRewardBankingStatus = 'bankable_now' | 'requires_service_update';
export type IslandRunLuckyRollRewardCategory = 'essence' | 'dice' | 'shards' | 'egg' | 'empty';

export interface IslandRunLuckyRollBoardConfigOptions {
  islandNumber?: number;
  cycleIndex?: number;
}

export interface IslandRunLuckyRollRewardConfig {
  type: IslandRunLuckyRollRewardType;
  amount?: number;
  essenceWeight?: number;
}

export interface IslandRunLuckyRollTileConfig {
  tileId: number;
  kind: IslandRunLuckyRollTileKind;
  rewardCategory: IslandRunLuckyRollRewardCategory;
  rewards: readonly IslandRunLuckyRollRewardConfig[];
  moveDelta?: number;
  label: string;
  iconHint: string;
  copy: string;
}

export interface IslandRunLuckyRollBoardConfig {
  boardSize: number;
  finishTileId: number;
  /** Resolved tier used for reward scaling. Non-milestone callers fall back to the safe rare/base tier. */
  rewardTier: IslandRunTreasurePathMilestoneTier;
  /** Present only when the target island has Treasure Path milestone metadata. */
  milestoneTier?: IslandRunTreasurePathMilestoneTier;
  rollCostDice: 0;
  consumesNormalDicePool: false;
  endsWhenPositionAtOrBeyondTileId: number;
  tiles: readonly IslandRunLuckyRollTileConfig[];
}

export interface IslandRunLuckyRollRewardResolutionContext {
  islandNumber?: number;
  cycleIndex?: number;
}

export interface IslandRunLuckyRollResolvedReward {
  type: IslandRunLuckyRollRewardType;
  amount: number;
  bankingStatus: IslandRunLuckyRollRewardBankingStatus;
  bankingNote?: string;
}

export interface IslandRunLuckyRollResolvedTileReward {
  tileId: number;
  rewards: IslandRunLuckyRollResolvedReward[];
}

export interface IslandRunLuckyRollMoveResolutionContext {
  currentPosition?: number;
}

export interface IslandRunLuckyRollResolvedMove {
  tileId: number;
  moveDelta: number;
  destinationTileId: number | null;
  isBonusDetour: boolean;
}

const STATIC_TILE_CONFIGS: readonly IslandRunLuckyRollTileConfig[] = [
  cozy(0, 'Warm welcome', 'sparkles', 'A cozy sparkle spot to start the celebration.'),
  essence(1, 'Essence glow', 'essence', 'A bright burst of island-building Essence.', 1),
  shards(2, 'Sanctuary sparkle', 'shards', 'A little sanctuary progress for future creature care.', 4),
  egg(3, 'Treasure Egg', 'egg', 'You found an egg on an egg field.'),
  dice(4, 'Free dice boost', 'dice', 'A few bonus dice for more future adventures.', 2),
  essence(5, 'Essence bloom', 'essence', 'A cheerful Essence bloom for the next build.', 1),
  detour(6, -2, 'Bonus detour', 'detour', 'A joyful loop that makes the reward journey last longer.'),
  essence(7, 'Golden glow', 'essence', 'Golden Essence shines across the board.', 1),
  shards(8, 'Creature cheer', 'shards', 'A sweet shard boost for sanctuary progress.', 5),
  essence(9, 'Builder sparkle', 'essence', 'More Essence toward the next island dream.', 1),
  essence(10, 'Bright bundle', 'essence', 'A satisfying Essence bundle for the build path.', 1),
  dice(11, 'Adventure dice', 'dice', 'Free dice tucked into the celebration.', 3),
  essence(12, 'Essence confetti', 'essence', 'Confetti pops into extra Essence.', 1),
  detour(13, -3, 'Scenic detour', 'detour', 'A scenic bonus loop with extra time on the happy board.'),
  shards(14, 'Sanctuary gift', 'shards', 'A modest shard gift for future sanctuary choices.', 6),
  essence(15, 'Island shine', 'essence', 'Island shine becomes useful Essence.', 1),
  essence(16, 'Build boost', 'essence', 'A friendly build boost for the next landmark.', 1),
  dice(17, 'Lucky dice', 'dice', 'A small free dice lift keeps momentum feeling bright.', 2),
  egg(18, 'Treasure Egg', 'egg', 'A treasure field glows: you found an egg.'),
  essence(19, 'Essence ribbon', 'essence', 'A ribbon of Essence wraps the reward path.', 1),
  shards(20, 'Sanctuary ribbon', 'shards', 'Shards sparkle for future creature treats.', 6),
  essence(21, 'Happy harvest', 'essence', 'A happy Essence harvest for island progress.', 1),
  essence(22, 'Glow harvest', 'essence', 'Another glow of Essence for the next build.', 1),
  dice(23, 'Dice delight', 'dice', 'A meaningful but bounded free dice delight.', 4),
  egg(24, 'Treasure Egg', 'egg', 'This egg field sparkles because you found an egg.'),
  shards(25, 'Creature keepsake', 'shards', 'A small keepsake of shards for the sanctuary.', 7),
  essence(26, 'Essence shower', 'essence', 'A shower of Essence lands with a smile.', 1),
  essence(27, 'Big glow', 'essence', 'A bigger glow helps carry island progress forward.', 1),
  essence(28, 'Almost-there sparkle', 'essence', 'A bright almost-there Essence sparkle.', 1),
  finish(29),
];

const REWARD_AMOUNT_SCALE_BY_TIER: Record<IslandRunTreasurePathMilestoneTier, number> = {
  intro: 0.5,
  early: 0.75,
  rare: 1,
};

function essence(tileId: number, label: string, iconHint: string, copy: string, essenceWeight: number): IslandRunLuckyRollTileConfig {
  return { tileId, kind: 'essence', rewardCategory: 'essence', rewards: [{ type: 'essence', essenceWeight }], label, iconHint, copy };
}

function dice(tileId: number, label: string, iconHint: string, copy: string, amount: number): IslandRunLuckyRollTileConfig {
  return { tileId, kind: 'dice', rewardCategory: 'dice', rewards: [{ type: 'dice', amount }], label, iconHint, copy };
}

function shards(tileId: number, label: string, iconHint: string, copy: string, amount: number): IslandRunLuckyRollTileConfig {
  return { tileId, kind: 'shards', rewardCategory: 'shards', rewards: [{ type: 'shards', amount }], label, iconHint, copy };
}

function egg(tileId: number, label: string, iconHint: string, copy: string): IslandRunLuckyRollTileConfig {
  return { tileId, kind: 'egg', rewardCategory: 'egg', rewards: [{ type: 'egg', amount: 1 }], label, iconHint, copy };
}

function cozy(tileId: number, label: string, iconHint: string, copy: string): IslandRunLuckyRollTileConfig {
  return { tileId, kind: 'empty', rewardCategory: 'empty', rewards: [], label, iconHint, copy };
}

function detour(tileId: number, moveDelta: number, label: string, iconHint: string, copy: string): IslandRunLuckyRollTileConfig {
  return { tileId, kind: 'bonus_detour', rewardCategory: 'empty', rewards: [], moveDelta, label, iconHint, copy };
}

function finish(tileId: number): IslandRunLuckyRollTileConfig {
  return {
    tileId,
    kind: 'finish',
    rewardCategory: 'essence',
    rewards: [
      { type: 'essence', essenceWeight: 2 },
      { type: 'dice', amount: 5 },
      { type: 'shards', amount: 10 },
    ],
    label: 'Lucky finish bundle',
    iconHint: 'finish_bundle',
    copy: 'A guaranteed happy bundle to finish the Lucky Roll journey.',
  };
}

function normalizeIslandNumber(islandNumber: number | undefined): number {
  return Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber as number)) : 1;
}

function normalizeCycleIndex(cycleIndex: number | undefined): number {
  return Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex as number)) : 0;
}

function getTotalEssenceWeight(): number {
  return STATIC_TILE_CONFIGS.reduce((total, tile) => total + tile.rewards.reduce((tileTotal, reward) => {
    if (reward.type !== 'essence') return tileTotal;
    return tileTotal + Math.max(0, reward.essenceWeight ?? 0);
  }, 0), 0);
}

export function getTreasurePathRewardTierForIsland(islandNumber: number | undefined): IslandRunTreasurePathMilestoneTier {
  return getTreasurePathMilestoneMetadata(normalizeIslandNumber(islandNumber))?.tier ?? 'rare';
}

function getOptionalTreasurePathMilestoneTier(islandNumber: number | undefined): IslandRunTreasurePathMilestoneTier | undefined {
  return getTreasurePathMilestoneMetadata(normalizeIslandNumber(islandNumber))?.tier;
}

function resolveEssenceBudget(context: IslandRunLuckyRollRewardResolutionContext): number {
  const islandNumber = normalizeIslandNumber(context.islandNumber);
  const cycleIndex = normalizeCycleIndex(context.cycleIndex);
  const effectiveIslandNumber = getEffectiveIslandNumber(islandNumber, cycleIndex);
  const nextIslandTotalCost = getIslandTotalEssenceCost(effectiveIslandNumber + 1);
  const rewardTier = getTreasurePathRewardTierForIsland(islandNumber);
  return Math.max(1, Math.floor(nextIslandTotalCost * ISLAND_RUN_LUCKY_ROLL_ESSENCE_PAYOUT_RATIOS_BY_TIER[rewardTier]));
}

function scaleRewardAmountForTier(amount: number, rewardTier: IslandRunTreasurePathMilestoneTier): number {
  return Math.max(0, Math.floor(amount * REWARD_AMOUNT_SCALE_BY_TIER[rewardTier]));
}

function resolveRewardAmount(
  reward: IslandRunLuckyRollRewardConfig,
  context: IslandRunLuckyRollRewardResolutionContext,
): number {
  if (reward.type === 'essence') {
    const totalWeight = Math.max(1, getTotalEssenceWeight());
    const weight = Math.max(0, reward.essenceWeight ?? 0);
    return Math.max(1, Math.floor((resolveEssenceBudget(context) * weight) / totalWeight));
  }
  if (reward.type === 'dice') {
    const rewardTier = getTreasurePathRewardTierForIsland(context.islandNumber);
    return Math.min(ISLAND_RUN_LUCKY_ROLL_MAX_DICE_REWARD, scaleRewardAmountForTier(reward.amount ?? 0, rewardTier));
  }
  if (reward.type === 'shards') {
    const rewardTier = getTreasurePathRewardTierForIsland(context.islandNumber);
    return scaleRewardAmountForTier(reward.amount ?? 0, rewardTier);
  }
  return Math.max(0, Math.floor(reward.amount ?? 0));
}

function resolveBankingStatus(): IslandRunLuckyRollRewardBankingStatus {
  return 'bankable_now';
}

export function getIslandRunLuckyRollBoardSize(): number {
  return ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE;
}

export function getIslandRunLuckyRollFinishTile(): number {
  return ISLAND_RUN_LUCKY_ROLL_FINISH_TILE;
}

export function getIslandRunLuckyRollBoardConfig(
  options: IslandRunLuckyRollBoardConfigOptions = {},
): IslandRunLuckyRollBoardConfig {
  const milestoneTier = getOptionalTreasurePathMilestoneTier(options.islandNumber);
  return {
    boardSize: ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE,
    finishTileId: ISLAND_RUN_LUCKY_ROLL_FINISH_TILE,
    rewardTier: milestoneTier ?? getTreasurePathRewardTierForIsland(options.islandNumber),
    ...(milestoneTier ? { milestoneTier } : {}),
    rollCostDice: 0,
    consumesNormalDicePool: false,
    endsWhenPositionAtOrBeyondTileId: ISLAND_RUN_LUCKY_ROLL_FINISH_TILE,
    tiles: STATIC_TILE_CONFIGS,
  };
}

export function getIslandRunLuckyRollTileConfig(
  tileId: number,
  options: IslandRunLuckyRollBoardConfigOptions = {},
): IslandRunLuckyRollTileConfig | null {
  const normalizedTileId = Number.isFinite(tileId) ? Math.floor(tileId) : -1;
  return getIslandRunLuckyRollBoardConfig(options).tiles.find((tile) => tile.tileId === normalizedTileId) ?? null;
}

export function resolveIslandRunLuckyRollTileReward(
  tileId: number,
  context: IslandRunLuckyRollRewardResolutionContext = {},
): IslandRunLuckyRollResolvedTileReward | null {
  const tile = getIslandRunLuckyRollTileConfig(tileId, context);
  if (!tile) return null;
  return {
    tileId: tile.tileId,
    rewards: tile.rewards
      .map((reward): IslandRunLuckyRollResolvedReward => {
          const bankingStatus = resolveBankingStatus();
        return {
          type: reward.type,
          amount: resolveRewardAmount(reward, context),
          bankingStatus,
        };
      })
      .filter((reward) => reward.amount > 0),
  };
}

export function resolveIslandRunLuckyRollMove(
  tileId: number,
  context: IslandRunLuckyRollMoveResolutionContext = {},
): IslandRunLuckyRollResolvedMove | null {
  const tile = getIslandRunLuckyRollTileConfig(tileId);
  if (!tile) return null;
  const moveDelta = Math.min(0, Math.floor(tile.moveDelta ?? 0));
  const hasCurrentPosition = Number.isFinite(context.currentPosition);
  return {
    tileId: tile.tileId,
    moveDelta,
    destinationTileId: hasCurrentPosition
      ? Math.max(0, Math.min(ISLAND_RUN_LUCKY_ROLL_FINISH_TILE, Math.floor(context.currentPosition as number) + moveDelta))
      : null,
    isBonusDetour: tile.kind === 'bonus_detour' && moveDelta < 0,
  };
}

export function canResolveIslandRunLuckyRollBoardForTreasurePathMilestoneIsland(islandNumber: number): boolean {
  return Boolean(getTreasurePathMilestoneMetadata(islandNumber) && getIslandRunLuckyRollBoardConfig({ islandNumber }).tiles.length === ISLAND_RUN_LUCKY_ROLL_BOARD_SIZE);
}

export function canResolveIslandRunLuckyRollBoardForPostRareIsland(islandNumber: number): boolean {
  return canResolveIslandRunLuckyRollBoardForTreasurePathMilestoneIsland(islandNumber);
}
