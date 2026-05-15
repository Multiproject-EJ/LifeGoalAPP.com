import { canChallengeBoss } from './islandRunBossEncounter';
import {
  getEffectiveIslandNumber,
  isStopBuildFullyComplete,
  MAX_BUILD_LEVEL,
  type IslandRunContractV2BuildState,
} from './islandRunContractV2EssenceBuild';
import { canClaimIslandRunContractV2RewardBar } from './islandRunContractV2RewardBar';
import { resolveNextRollEtaMs } from './islandRunDiceRegeneration';
import { getActiveEvent } from './islandRunEventEngine';
import type { IslandRunGameStateRecord, PerIslandEggEntry } from './islandRunGameStateStore';
import {
  getCompletedStopsForIsland,
  getEffectiveCompletedStops,
  isIslandStopEffectivelyCompleted,
} from './islandRunStopCompletion';
import { isIslandFullyCleared } from './islandRunProgression';
import { generateIslandStopPlan } from './islandRunStops';
import { getStopTicketCost, getStopTicketsPaidForIsland, isStopTicketPaid, STOP_COUNT } from './islandRunStopTickets';

export type IslandRunBestNextActionKind =
  | 'claim_island_clear'
  | 'claim_reward_bar'
  | 'collect_egg'
  | 'set_egg_hatchery'
  | 'pay_stop_ticket'
  | 'complete_active_stop'
  | 'challenge_boss'
  | 'fund_building'
  | 'roll'
  | 'play_event_minigame'
  | 'wait_for_dice_regen'
  | 'buy_dice'
  | 'resolve_stuck';

export type IslandRunBestNextActionUrgency = 'critical' | 'high' | 'normal' | 'low';

export interface IslandRunBestNextActionResult {
  action: IslandRunBestNextActionKind;
  urgency: IslandRunBestNextActionUrgency;
  ctaLabel: string;
  reason: string;
  meta?: {
    stopId?: string;
    stopIndex?: number;
    eventId?: string;
    regenEtaMs?: number;
  };
}

export interface IslandRunBestNextActionInput {
  record: IslandRunGameStateRecord;
  nowMs: number;
  playerLevel: number;
}

const ACTIVE_FIRST_SESSION_TUTORIAL_STATES = new Set<unknown>([
  'awaiting_first_roll',
  'first_roll_consumed',
  'first_essence_reward_claimed',
  'build_prompt_visible',
  'build_modal_opened',
  'hatchery_l1_built',
  'hatchery_l1_celebrated',
  'normal_play_until_low_dice',
  'first_creature_pack_available',
  'first_creature_pack_opened',
  'first_creature_pack_claimed',
]);

function isFirstSessionTutorialActive(record: IslandRunGameStateRecord): boolean {
  return ACTIVE_FIRST_SESSION_TUTORIAL_STATES.has(record.firstSessionTutorialState);
}

function getCurrentIslandKey(record: IslandRunGameStateRecord): string {
  return String(Math.max(1, Math.floor(record.currentIslandNumber)));
}

function hasActiveEgg(record: IslandRunGameStateRecord): boolean {
  return record.activeEggTier !== null && record.activeEggSetAtMs !== null;
}

function getCurrentIslandEgg(record: IslandRunGameStateRecord): PerIslandEggEntry | null {
  return record.perIslandEggs[getCurrentIslandKey(record)] ?? null;
}

function isEggSlotUsed(record: IslandRunGameStateRecord): boolean {
  return getCurrentIslandEgg(record) !== null;
}

function isCollectableEggReady(record: IslandRunGameStateRecord, nowMs: number): boolean {
  const islandEgg = getCurrentIslandEgg(record);
  if (islandEgg) {
    if (islandEgg.status === 'collected' || islandEgg.status === 'sold') return false;
    return islandEgg.status === 'ready' || Math.floor(nowMs) >= Math.floor(islandEgg.hatchAtMs);
  }

  if (!record.activeEggTier || record.activeEggSetAtMs === null || record.activeEggHatchDurationMs === null) {
    return false;
  }

  const hatchAtMs = Math.floor(record.activeEggSetAtMs) + Math.max(0, Math.floor(record.activeEggHatchDurationMs));
  return Math.floor(nowMs) >= hatchAtMs;
}

function isStopEffectivelyCompleteByIndex(options: {
  record: IslandRunGameStateRecord;
  stopId: string | null;
  completedStops: string[];
}): boolean {
  return isIslandStopEffectivelyCompleted({
    stopId: options.stopId,
    completedStops: options.completedStops,
    hasActiveEgg: hasActiveEgg(options.record),
    islandEggSlotUsed: isEggSlotUsed(options.record),
  });
}

function areAllBuildingsFullyComplete(record: IslandRunGameStateRecord): boolean {
  return Array.from({ length: STOP_COUNT }, (_, stopIndex) => record.stopBuildStateByIndex[stopIndex]).every(
    (buildState) => buildState != null && isStopBuildFullyComplete(buildState),
  );
}

function getAffordableBuildIndex(record: IslandRunGameStateRecord): number | null {
  const wallet = Math.max(0, Math.floor(record.essence));
  // Match the investigation priority: boss-arena (4) first, then landmarks in order (0-3).
  const candidateIndices = [4, 0, 1, 2, 3];

  for (const stopIndex of candidateIndices) {
    const buildState = record.stopBuildStateByIndex[stopIndex];
    if (!buildState || isStopBuildFullyComplete(buildState)) continue;
    const remaining = getCurrentBuildLevelRemaining(buildState);
    if (remaining > 0 && wallet >= remaining) return stopIndex;
  }

  return null;
}

function getCurrentBuildLevelRemaining(buildState: IslandRunContractV2BuildState): number {
  if (buildState.buildLevel >= MAX_BUILD_LEVEL) return 0;
  const required = Math.max(0, Math.floor(buildState.requiredEssence));
  const spent = Math.max(0, Math.floor(buildState.spentEssence));
  return Math.max(0, required - spent);
}

export function resolveIslandRunBestNextAction(input: IslandRunBestNextActionInput): IslandRunBestNextActionResult | null {
  const { record, nowMs } = input;
  if (isFirstSessionTutorialActive(record)) return null;

  const islandNumber = Math.max(1, Math.floor(record.currentIslandNumber));
  const stopPlan = generateIslandStopPlan(islandNumber);
  const completedStops = getCompletedStopsForIsland(record.completedStopsByIsland, islandNumber);
  const effectiveCompletedStops = getEffectiveCompletedStops({
    completedStops,
    hasActiveEgg: hasActiveEgg(record),
    islandEggSlotUsed: isEggSlotUsed(record),
  });

  if (isIslandFullyCleared(islandNumber, effectiveCompletedStops) && areAllBuildingsFullyComplete(record)) {
    return {
      action: 'claim_island_clear',
      urgency: 'critical',
      ctaLabel: 'Claim island clear',
      reason: 'All island landmarks and buildings are complete.',
    };
  }

  if (canClaimIslandRunContractV2RewardBar(record)) {
    return {
      action: 'claim_reward_bar',
      urgency: 'critical',
      ctaLabel: 'Claim reward',
      reason: 'The Island Run reward bar is full.',
    };
  }

  if (isCollectableEggReady(record, nowMs)) {
    return {
      action: 'collect_egg',
      urgency: 'high',
      ctaLabel: 'Collect egg',
      reason: 'An egg is ready to collect from the Hatchery.',
      meta: { stopId: 'hatchery', stopIndex: 0 },
    };
  }

  if (!isStopEffectivelyCompleteByIndex({ record, stopId: 'hatchery', completedStops })) {
    return {
      action: 'set_egg_hatchery',
      urgency: 'high',
      ctaLabel: 'Set egg',
      reason: 'Set an egg in the Hatchery to unlock island progression.',
      meta: { stopId: 'hatchery', stopIndex: 0 },
    };
  }

  const ticketsPaid = getStopTicketsPaidForIsland(record.stopTicketsPaidByIsland, islandNumber);
  const effectiveIslandNumber = getEffectiveIslandNumber(islandNumber, record.cycleIndex);
  for (let stopIndex = 1; stopIndex < STOP_COUNT; stopIndex += 1) {
    if (isStopTicketPaid({ ticketsPaid, stopIndex })) continue;
    const previousStopId = stopPlan[stopIndex - 1]?.stopId ?? null;
    if (!isStopEffectivelyCompleteByIndex({ record, stopId: previousStopId, completedStops: effectiveCompletedStops })) {
      continue;
    }
    const cost = getStopTicketCost({ effectiveIslandNumber, stopIndex });
    if (Math.max(0, Math.floor(record.essence)) >= cost) {
      const stopId = stopPlan[stopIndex]?.stopId;
      return {
        action: 'pay_stop_ticket',
        urgency: 'high',
        ctaLabel: 'Open landmark',
        reason: 'You have enough essence to open the next landmark.',
        meta: { stopId, stopIndex },
      };
    }
    break;
  }

  const bossDefeated = record.bossTrialResolvedIslandNumber === islandNumber;
  if (canChallengeBoss({ stopBuildStateByIndex: record.stopBuildStateByIndex, isBossDefeated: bossDefeated })) {
    return {
      action: 'challenge_boss',
      urgency: 'high',
      ctaLabel: 'Challenge boss',
      reason: 'The Boss Arena is built and the boss is ready.',
      meta: { stopId: 'boss', stopIndex: 4 },
    };
  }

  for (let stopIndex = 0; stopIndex < STOP_COUNT; stopIndex += 1) {
    if (!isStopTicketPaid({ ticketsPaid, stopIndex })) continue;
    const previousStopId = stopIndex > 0 ? stopPlan[stopIndex - 1]?.stopId ?? null : null;
    if (
      stopIndex > 0
      && !isStopEffectivelyCompleteByIndex({ record, stopId: previousStopId, completedStops: effectiveCompletedStops })
    ) {
      continue;
    }
    const stopId = stopPlan[stopIndex]?.stopId ?? null;
    if (isStopEffectivelyCompleteByIndex({ record, stopId, completedStops: effectiveCompletedStops })) continue;
    // Objective-incomplete paid stops are actionable; Hatchery's egg-slot completion is filtered above.
    if (record.stopStatesByIndex[stopIndex]?.objectiveComplete === false) {
      return {
        action: 'complete_active_stop',
        urgency: 'normal',
        ctaLabel: 'Complete landmark',
        reason: 'A paid landmark is open and still needs completion.',
        meta: { stopId: stopId ?? undefined, stopIndex },
      };
    }
  }

  const affordableBuildIndex = getAffordableBuildIndex(record);
  if (affordableBuildIndex !== null) {
    const stopId = stopPlan[affordableBuildIndex]?.stopId;
    return {
      action: 'fund_building',
      urgency: 'normal',
      ctaLabel: 'Fund building',
      reason: 'You have enough essence to fund a building upgrade.',
      meta: { stopId, stopIndex: affordableBuildIndex },
    };
  }

  if (Math.max(0, Math.floor(record.dicePool)) >= 1) {
    return {
      action: 'roll',
      urgency: 'normal',
      ctaLabel: 'Roll',
      reason: 'Island Dice are available for board movement.',
    };
  }

  const activeEvent = getActiveEvent(record, nowMs);
  if (activeEvent) {
    const canonicalTemplateId = activeEvent.eventId;
    const tickets = Math.max(0, Math.floor(record.minigameTicketsByEvent[canonicalTemplateId] ?? 0));
    if (tickets > 0) {
      return {
        action: 'play_event_minigame',
        urgency: 'low',
        ctaLabel: 'Play event',
        reason: 'Timed-event minigame tickets are available.',
        meta: { eventId: canonicalTemplateId },
      };
    }
  }

  if (Math.max(0, Math.floor(record.dicePool)) < 1) {
    const regenEtaMs = resolveNextRollEtaMs({
      dicePool: record.dicePool,
      target: 1,
      regenState: record.diceRegenState,
      nowMs,
    });
    if (Number.isFinite(regenEtaMs)) {
      return {
        action: 'wait_for_dice_regen',
        urgency: 'low',
        ctaLabel: 'Wait for dice',
        reason: 'The next Island Dice will regenerate soon.',
        meta: { regenEtaMs },
      };
    }
    if (record.diceRegenState && record.diceRegenState.maxDice < 1) {
      return {
        action: 'buy_dice',
        urgency: 'low',
        ctaLabel: 'Get dice',
        reason: 'No passive Island Dice regeneration is available.',
      };
    }
  }

  return {
    action: 'resolve_stuck',
    urgency: 'low',
    ctaLabel: 'Review island',
    reason: 'No safe next action could be resolved from the current Island Run state.',
  };
}
