/**
 * contractZenGardenRewards.ts
 * Awards Zen Garden items when contract milestones are reached.
 * Items are earned automatically (not purchased).
 */

import type { CommitmentContract } from '../types/gamification';
import { recordTelemetryEvent, type TelemetryEventMetadata } from '../services/telemetry';
import { grantEarnedZenItem } from '../services/zenGarden';

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
  zen_contract_scroll: {
    itemKey: 'zen_contract_scroll',
    emoji: '📜',
    name: 'Contract Scroll',
    description: 'Awarded for completing your first commitment contract.',
  },
  zen_sacred_stone: {
    itemKey: 'zen_sacred_stone',
    emoji: '🔱',
    name: 'Sacred Oath Stone',
    description: 'Awarded for keeping a sacred contract.',
  },
  zen_warrior_blade: {
    itemKey: 'zen_warrior_blade',
    emoji: '⚔️',
    name: "Warrior's Blade",
    description: 'Awarded for reaching narrative rank 3 as a Warrior.',
  },
  zen_monk_bell: {
    itemKey: 'zen_monk_bell',
    emoji: '🧘',
    name: "Monk's Bell",
    description: 'Awarded for reaching narrative rank 3 as a Monk.',
  },
  zen_scholar_tome: {
    itemKey: 'zen_scholar_tome',
    emoji: '📚',
    name: "Scholar's Tome",
    description: 'Awarded for reaching narrative rank 3 as a Scholar.',
  },
  zen_explorer_compass: {
    itemKey: 'zen_explorer_compass',
    emoji: '🧭',
    name: "Explorer's Compass",
    description: 'Awarded for reaching narrative rank 3 as an Explorer.',
  },
};

const NARRATIVE_THEME_REWARDS: Record<string, string> = {
  warrior: 'zen_warrior_blade',
  monk: 'zen_monk_bell',
  scholar: 'zen_scholar_tome',
  explorer: 'zen_explorer_compass',
};

// =====================================================
// CHECK + AWARD LOGIC
// =====================================================

/**
 * Checks whether a contract milestone just unlocked a Zen Garden item.
 * Returns the reward item if awarded, null otherwise.
 * Grants the item to the user's Zen Garden inventory and fires a telemetry event.
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
    await awardZenItem(userId, contract, 'zen_contract_scroll');
    return CONTRACT_ZEN_REWARDS.zen_contract_scroll;
  }

  // Sacred contract kept
  if (isSacred && contractType === 'sacred') {
    await awardZenItem(userId, contract, 'zen_sacred_stone');
    return CONTRACT_ZEN_REWARDS.zen_sacred_stone;
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

  await grantEarnedZenItem(userId, itemKey, reward.name);
}
