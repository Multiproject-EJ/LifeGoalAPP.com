/**
 * contractZenGardenRewards.ts
 * Awards Zen Garden items when contract milestones are reached.
 * Items are earned automatically (not purchased).
 */

import type { CommitmentContract } from '../types/gamification';
import { recordTelemetryEvent, type TelemetryEventMetadata } from '../services/telemetry';

// =====================================================
// REWARD DEFINITIONS
// =====================================================

export interface ZenGardenContractReward {
  itemKey: string;
  emoji: string;
  name: string;
  description: string;
}

export const CONTRACT_ZEN_REWARDS: Record<string, ZenGardenContractReward> = {
  contract_scroll: {
    itemKey: 'contract_scroll',
    emoji: '📜',
    name: 'Contract Scroll',
    description: 'Awarded for completing your first commitment contract.',
  },
  sacred_oath_stone: {
    itemKey: 'sacred_oath_stone',
    emoji: '🔱',
    name: 'Sacred Oath Stone',
    description: 'Awarded for keeping a sacred contract.',
  },
  warriors_blade: {
    itemKey: 'warriors_blade',
    emoji: '⚔️',
    name: "Warrior's Blade",
    description: 'Awarded for reaching narrative rank 3 as a Warrior.',
  },
  monks_bell: {
    itemKey: 'monks_bell',
    emoji: '🔔',
    name: "Monk's Bell",
    description: 'Awarded for reaching narrative rank 3 as a Monk.',
  },
  scholars_tome: {
    itemKey: 'scholars_tome',
    emoji: '📚',
    name: "Scholar's Tome",
    description: 'Awarded for reaching narrative rank 3 as a Scholar.',
  },
  explorers_compass: {
    itemKey: 'explorers_compass',
    emoji: '🧭',
    name: "Explorer's Compass",
    description: 'Awarded for reaching narrative rank 3 as an Explorer.',
  },
};

const NARRATIVE_THEME_REWARDS: Record<string, string> = {
  warrior: 'warriors_blade',
  monk: 'monks_bell',
  scholar: 'scholars_tome',
  explorer: 'explorers_compass',
};

// =====================================================
// CHECK + AWARD LOGIC
// =====================================================

/**
 * Checks whether a contract milestone just unlocked a Zen Garden item.
 * Returns the reward item if awarded, null otherwise.
 * Fires a telemetry event when an item is awarded.
 */
export async function checkContractZenGardenRewards(
  userId: string,
  contract: CommitmentContract,
  result: 'success' | 'miss'
): Promise<ZenGardenContractReward | null> {
  if (result !== 'success') return null;

  const { successCount, contractType, isSacred, narrativeTheme, narrativeRank } = contract;

  // First contract ever completed
  if (successCount === 1) {
    await awardZenItem(userId, contract, 'contract_scroll');
    return CONTRACT_ZEN_REWARDS.contract_scroll;
  }

  // Sacred contract kept
  if (isSacred && contractType === 'sacred') {
    await awardZenItem(userId, contract, 'sacred_oath_stone');
    return CONTRACT_ZEN_REWARDS.sacred_oath_stone;
  }

  // Narrative contract at rank 3
  if (contractType === 'narrative' && narrativeTheme && (narrativeRank ?? 0) >= 3) {
    const rewardKey = NARRATIVE_THEME_REWARDS[narrativeTheme];
    if (rewardKey) {
      await awardZenItem(userId, contract, rewardKey);
      return CONTRACT_ZEN_REWARDS[rewardKey] ?? null;
    }
  }

  return null;
}

async function awardZenItem(
  userId: string,
  contract: CommitmentContract,
  itemKey: string
): Promise<void> {
  const reward = CONTRACT_ZEN_REWARDS[itemKey];
  if (!reward) return;

  void recordTelemetryEvent({
    userId,
    eventType: 'contract_zen_reward_awarded',
    metadata: {
      contractId: contract.id,
      itemKey,
      itemName: reward.name,
      contractType: contract.contractType,
    } as TelemetryEventMetadata,
  });

  // NOTE: Item award is logged via telemetry but NOT yet added to the Zen Garden inventory.
  // TODO: When the Zen Garden inventory service exposes a public `grantEarnedItem(userId, itemKey)`
  //       function, call it here to materialize the item in the user's garden.
  //       Until then, the telemetry event acts as an audit trail that can be replayed.
}
