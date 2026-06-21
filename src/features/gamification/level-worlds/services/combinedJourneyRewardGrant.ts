import {
  EGG_REWARD_RARITY_ROLL_DENOMINATOR,
  EGG_REWARD_RARITY_THRESHOLD,
  type EggRewardInventoryEntry,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import type { JourneyChestReward } from './combinedJourneyRewardLadder';

/**
 * Combined Journey Level — apply a granted reward to a runtime record (R6).
 *
 * Pure record transform used by the claim action after the server-authoritative
 * RPC resolves the reward. Currency rewards (dice/essence) are simple increments;
 * eggs append an unopened entry to the existing egg-reward inventory; reroll-
 * capacity raises the persistent bonusMaxDice modifier the dice-regen system
 * layers on top of the level-derived cap. All persist through the standard
 * commit path.
 */

const JOURNEY_EGG_RESOLVER_VERSION = 'egg_pack_v1' as const;

function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic, stable id so re-grants of the same threshold never duplicate. */
export function journeyEggRewardId(thresholdLevel: number): string {
  return `combined_journey:lv${Math.floor(thresholdLevel)}:egg`;
}

function buildJourneyEggEntry(
  record: IslandRunGameStateRecord,
  thresholdLevel: number,
  nowMs: number,
): EggRewardInventoryEntry {
  const eggRewardId = journeyEggRewardId(thresholdLevel);
  const targetIslandNumber = Math.max(1, Math.floor(record.currentIslandNumber));
  const eggTier = 'common' as const;
  const seed = hashStringToUint32(`combined_journey:${eggRewardId}:${eggTier}:${targetIslandNumber}`);
  return {
    eggRewardId,
    source: 'egg_pack',
    sourceSessionKey: `combined_journey:lv${Math.floor(thresholdLevel)}`,
    sourceRunId: `combined_journey_lv${Math.floor(thresholdLevel)}`,
    sourceRewardId: `egg:lv${Math.floor(thresholdLevel)}`,
    tileId: 0,
    cycleIndex: Math.max(0, Math.floor(record.cycleIndex ?? 0)),
    targetIslandNumber,
    eggTier,
    eggSeed: seed,
    rarityRoll: seed % EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityRollDenominator: EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityThreshold: EGG_REWARD_RARITY_THRESHOLD,
    resolverVersion: JOURNEY_EGG_RESOLVER_VERSION,
    status: 'unopened',
    grantedAtMs: Math.max(0, Math.floor(nowMs)),
    openedAtMs: null,
  };
}

export function applyJourneyRewardToRecord(
  record: IslandRunGameStateRecord,
  reward: JourneyChestReward,
  options: { thresholdLevel: number; nowMs: number },
): IslandRunGameStateRecord {
  switch (reward.kind) {
    case 'dice':
      if (reward.amount <= 0) return record;
      return {
        ...record,
        dicePool: record.dicePool + reward.amount,
        runtimeVersion: record.runtimeVersion + 1,
      };
    case 'essence':
      if (reward.amount <= 0) return record;
      return {
        ...record,
        essence: record.essence + reward.amount,
        essenceLifetimeEarned: record.essenceLifetimeEarned + reward.amount,
        runtimeVersion: record.runtimeVersion + 1,
      };
    case 'egg': {
      const eggRewardId = journeyEggRewardId(options.thresholdLevel);
      // Idempotent: never add the same threshold's egg twice.
      if (record.eggRewardInventory.some((entry) => entry.eggRewardId === eggRewardId)) {
        return record;
      }
      return {
        ...record,
        eggRewardInventory: [
          ...record.eggRewardInventory,
          buildJourneyEggEntry(record, options.thresholdLevel, options.nowMs),
        ],
        runtimeVersion: record.runtimeVersion + 1,
      };
    }
    case 'reroll_capacity':
      if (reward.amount <= 0) return record;
      return {
        ...record,
        bonusMaxDice: Math.max(0, Math.floor(record.bonusMaxDice ?? 0)) + reward.amount,
        runtimeVersion: record.runtimeVersion + 1,
      };
    default:
      return record;
  }
}
