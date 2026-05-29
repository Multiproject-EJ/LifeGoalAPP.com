import {
  applyIslandRunContractV2RewardBarProgress,
  canClaimIslandRunContractV2RewardBar,
  clampMultiplierToPool,
  ensureIslandRunContractV2ActiveTimedEvent,
  resolveChainedRewardBarClaims,
  resolveDiceCostForMultiplier,
  resolveMaxMultiplierForPool,
  type IslandRunRewardBarRuntimeSlice,
} from './islandRunContractV2RewardBar';
import { applyDiceRegeneration, buildInitialDiceRegenState } from './islandRunDiceRegeneration';
import { getIslandRunLuckyRollBoardConfig, resolveIslandRunLuckyRollTileReward } from './islandRunLuckyRollBoardConfig';
import { SPACE_EXCAVATOR_CAMPAIGN_MILESTONES } from './spaceExcavatorCampaignProgress';

export type IslandRunIntegratedEconomySourceKind =
  | 'reward_bar_claim'
  | 'lucky_roll_production_board'
  | 'space_excavator_campaign_milestone'
  | 'passive_dice_regen_single_refill';

export interface IslandRunIntegratedEconomySourceLedgerEntry {
  kind: IslandRunIntegratedEconomySourceKind;
  dice: number;
  note: string;
}

export interface IslandRunIntegratedEconomySafetyOptions {
  startingDice: number;
  rollAttempts: number;
  playerLevel?: number;
  islandNumber?: number;
  cycleIndex?: number;
  includeLuckyRollProductionBoard?: boolean;
  includeSpaceExcavatorCampaignMilestones?: boolean;
  includeSinglePassiveRegenRefill?: boolean;
  nowMs?: number;
}

export interface IslandRunIntegratedEconomySafetyResult {
  startingDice: number;
  dicePool: number;
  diceSpent: number;
  diceAwarded: number;
  rewardBarDiceAwarded: number;
  externalDiceAwarded: number;
  stickerCompletionBonusDiceAwarded: number;
  rollAttempts: number;
  rollsTaken: number;
  totalRewardBarClaims: number;
  maxRewardBarClaimsFromSingleBatch: number;
  cappedRewardBarDrainBatches: number;
  passiveRegenRefillsApplied: number;
  rewardBarState: IslandRunRewardBarRuntimeSlice;
  sourceLedger: IslandRunIntegratedEconomySourceLedgerEntry[];
}

function makeBaseRewardBarState(): IslandRunRewardBarRuntimeSlice {
  return {
    rewardBarProgress: 0,
    rewardBarThreshold: 4,
    rewardBarClaimCountInEvent: 0,
    rewardBarEscalationTier: 0,
    rewardBarLastClaimAtMs: null,
    rewardBarBoundEventId: null,
    rewardBarLadderId: null,
    activeTimedEvent: null,
    activeTimedEventProgress: {
      feedingActions: 0,
      tokensEarned: 0,
      milestonesClaimed: 0,
    },
    stickerProgress: {
      fragments: 0,
    },
    stickerInventory: {},
  };
}

function drainRewardBarClaims(options: {
  state: IslandRunRewardBarRuntimeSlice;
  nowMs: number;
  maxDrainBatches?: number;
}): {
  state: IslandRunRewardBarRuntimeSlice;
  payouts: ReturnType<typeof resolveChainedRewardBarClaims>['payouts'];
  maxBatchClaims: number;
  cappedBatches: number;
} {
  const maxDrainBatches = options.maxDrainBatches ?? 50;
  let state = options.state;
  const payouts: ReturnType<typeof resolveChainedRewardBarClaims>['payouts'] = [];
  let maxBatchClaims = 0;
  let cappedBatches = 0;

  for (let batch = 0; batch < maxDrainBatches; batch += 1) {
    if (!canClaimIslandRunContractV2RewardBar(state)) {
      return { state, payouts, maxBatchClaims, cappedBatches };
    }

    const chainResult = resolveChainedRewardBarClaims({ state, nowMs: options.nowMs + batch, maxChain: 10 });
    state = chainResult.state;
    payouts.push(...chainResult.payouts);
    maxBatchClaims = Math.max(maxBatchClaims, chainResult.payouts.length);
    if (chainResult.payouts.length >= 10) cappedBatches += 1;

    if (chainResult.payouts.length === 0) {
      return { state, payouts, maxBatchClaims, cappedBatches };
    }
  }

  throw new Error(`Integrated economy reward-bar drain exceeded ${maxDrainBatches} batches; possible infinite claim chain`);
}

export function resolveLuckyRollProductionBoardMaxDice(options: {
  islandNumber?: number;
  cycleIndex?: number;
} = {}): number {
  const config = getIslandRunLuckyRollBoardConfig({
    islandNumber: options.islandNumber,
    cycleIndex: options.cycleIndex,
  });
  return config.tiles.reduce((total, tile) => {
    const resolved = resolveIslandRunLuckyRollTileReward(tile.tileId, {
      islandNumber: options.islandNumber,
      cycleIndex: options.cycleIndex,
    });
    return total + (resolved?.rewards ?? [])
      .filter((reward) => reward.type === 'dice')
      .reduce((tileTotal, reward) => tileTotal + reward.amount, 0);
  }, 0);
}

export function resolveSpaceExcavatorCampaignMilestoneDiceTotal(): number {
  return SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.reduce(
    (total, milestone) => total + Math.max(0, Math.floor(milestone.reward.dicePool ?? 0)),
    0,
  );
}

export function simulateIslandRunIntegratedEconomySafety(
  options: IslandRunIntegratedEconomySafetyOptions,
): IslandRunIntegratedEconomySafetyResult {
  const startingDice = Math.max(0, Math.floor(options.startingDice));
  const rollAttempts = Math.max(0, Math.floor(options.rollAttempts));
  const playerLevel = Number.isFinite(options.playerLevel) ? Math.max(1, Math.floor(options.playerLevel as number)) : 125;
  const baseNowMs = Number.isFinite(options.nowMs) ? Math.max(0, Math.floor(options.nowMs as number)) : 1_000;
  const islandNumber = Number.isFinite(options.islandNumber) ? Math.max(1, Math.floor(options.islandNumber as number)) : 1;
  const cycleIndex = Number.isFinite(options.cycleIndex) ? Math.max(0, Math.floor(options.cycleIndex as number)) : 0;

  let dicePool = startingDice;
  let diceSpent = 0;
  let diceAwarded = 0;
  let rewardBarDiceAwarded = 0;
  let externalDiceAwarded = 0;
  let stickerCompletionBonusDiceAwarded = 0;
  let rollsTaken = 0;
  let totalRewardBarClaims = 0;
  let maxRewardBarClaimsFromSingleBatch = 0;
  let cappedRewardBarDrainBatches = 0;
  let passiveRegenRefillsApplied = 0;
  const sourceLedger: IslandRunIntegratedEconomySourceLedgerEntry[] = [];
  let rewardBarState = ensureIslandRunContractV2ActiveTimedEvent({
    state: makeBaseRewardBarState(),
    nowMs: baseNowMs,
  }).state;

  const addExternalDice = (kind: IslandRunIntegratedEconomySourceKind, dice: number, note: string) => {
    const safeDice = Math.max(0, Math.floor(dice));
    if (safeDice <= 0) return;
    dicePool += safeDice;
    diceAwarded += safeDice;
    externalDiceAwarded += safeDice;
    sourceLedger.push({ kind, dice: safeDice, note });
  };

  if (options.includeLuckyRollProductionBoard) {
    addExternalDice(
      'lucky_roll_production_board',
      resolveLuckyRollProductionBoardMaxDice({ islandNumber, cycleIndex }),
      'Conservative one-session sum of each unique dice reward on the production Lucky Roll board.',
    );
  }

  if (options.includeSpaceExcavatorCampaignMilestones) {
    addExternalDice(
      'space_excavator_campaign_milestone',
      resolveSpaceExcavatorCampaignMilestoneDiceTotal(),
      'Conservative full campaign sum of Space Excavator dice-bearing milestones; milestones are claim-once per campaign progress.',
    );
  }

  const regenAnchorMs = baseNowMs;
  let passiveRegenConsumed = !options.includeSinglePassiveRegenRefill;

  for (let i = 0; i < rollAttempts; i += 1) {
    let multiplier = clampMultiplierToPool(resolveMaxMultiplierForPool(dicePool), dicePool);
    let diceCost = resolveDiceCostForMultiplier(multiplier);

    if (dicePool < diceCost && !passiveRegenConsumed) {
      const initialRegenState = buildInitialDiceRegenState(playerLevel, regenAnchorMs);
      const fullRefill = applyDiceRegeneration({
        currentDicePool: dicePool,
        regenState: initialRegenState,
        playerLevel,
        nowMs: regenAnchorMs + 365 * 24 * 60 * 60 * 1000,
      });
      passiveRegenConsumed = true;
      passiveRegenRefillsApplied += fullRefill.diceAdded > 0 ? 1 : 0;
      addExternalDice(
        'passive_dice_regen_single_refill',
        fullRefill.diceAdded,
        'One bounded passive regen catch-up to the level-band max after the roll pool falls below the next roll cost.',
      );
      multiplier = clampMultiplierToPool(resolveMaxMultiplierForPool(dicePool), dicePool);
      diceCost = resolveDiceCostForMultiplier(multiplier);
    }

    if (dicePool < diceCost) break;

    dicePool -= diceCost;
    diceSpent += diceCost;
    rollsTaken += 1;

    rewardBarState = applyIslandRunContractV2RewardBarProgress({
      state: rewardBarState,
      source: { kind: 'tile', tileType: 'chest' },
      nowMs: baseNowMs + 100 + i,
      multiplier,
    });

    const drained = drainRewardBarClaims({ state: rewardBarState, nowMs: baseNowMs + 1_000 + i * 100 });
    rewardBarState = drained.state;
    totalRewardBarClaims += drained.payouts.length;
    maxRewardBarClaimsFromSingleBatch = Math.max(maxRewardBarClaimsFromSingleBatch, drained.maxBatchClaims);
    cappedRewardBarDrainBatches += drained.cappedBatches;

    for (const payout of drained.payouts) {
      if (payout.dice <= 0) continue;
      dicePool += payout.dice;
      diceAwarded += payout.dice;
      rewardBarDiceAwarded += payout.dice;
      stickerCompletionBonusDiceAwarded += payout.stickerCompletionBonusDice;
      sourceLedger.push({
        kind: 'reward_bar_claim',
        dice: payout.dice,
        note: `Reward-bar ${payout.rewardKind} claim payout.`,
      });
    }
  }

  return {
    startingDice,
    dicePool,
    diceSpent,
    diceAwarded,
    rewardBarDiceAwarded,
    externalDiceAwarded,
    stickerCompletionBonusDiceAwarded,
    rollAttempts,
    rollsTaken,
    totalRewardBarClaims,
    maxRewardBarClaimsFromSingleBatch,
    cappedRewardBarDrainBatches,
    passiveRegenRefillsApplied,
    rewardBarState,
    sourceLedger,
  };
}
