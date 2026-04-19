/**
 * islandRunProgressReset — Resets the player's Island Run game progress
 * to a fresh start (island 1, starting dice/essence, clean stops).
 *
 * **What is reset:**
 * - Island position → island 1, tile 0
 * - Currencies → starting dice (30), 0 essence, 3 diamonds, 0 shards
 * - Stops, boss, reward bar, eggs, creatures → default/empty
 * - Onboarding flags (firstRunClaimed, storyPrologueSeen) → false
 *
 * **What is preserved (user preferences):**
 * - audioEnabled (player's sound preference)
 * - onboardingDisplayNameLoopCompleted (display name already set)
 *
 * **What is NOT touched (separate systems):**
 * - XP and Level (gamification_profiles table — app-wide, not island-specific)
 * - Journals, habits, telemetry, achievements, identity data
 * - Streak data, lives, power-ups
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from './islandRunEconomy';
import {
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
} from './islandRunGameStateStore';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';

/**
 * Builds a fresh Island Run game state record, preserving only user
 * preferences (audio, display name completion) from the current state.
 */
export function buildFreshIslandRunRecord(
  current: Pick<IslandRunGameStateRecord, 'audioEnabled' | 'onboardingDisplayNameLoopCompleted'>,
): IslandRunGameStateRecord {
  const nowMs = Date.now();
  return {
    runtimeVersion: 0,
    firstRunClaimed: false,
    dailyHeartsClaimedDayKey: null,
    onboardingDisplayNameLoopCompleted: current.onboardingDisplayNameLoopCompleted,
    storyPrologueSeen: false,
    audioEnabled: current.audioEnabled,
    currentIslandNumber: 1,
    cycleIndex: 0,
    bossTrialResolvedIslandNumber: null,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {},
    islandStartedAtMs: nowMs,
    islandExpiresAtMs: nowMs + 48 * 60 * 60 * 1000,
    islandShards: 0,
    tokenIndex: 0,
    spinTokens: 0,
    dicePool: ISLAND_RUN_DEFAULT_STARTING_DICE,
    shardTierIndex: 0,
    shardClaimCount: 0,
    shields: 0,
    shards: 0,
    diamonds: 3,
    creatureTreatInventory: {
      basic: 3,
      favorite: 1,
      rare: 0,
    },
    companionBonusLastVisitKey: null,
    completedStopsByIsland: {},
    stopTicketsPaidByIsland: {},
    marketOwnedBundlesByIsland: {},
    creatureCollection: [],
    activeCompanionId: null,
    perfectCompanionIds: [],
    perfectCompanionReasons: {},
    perfectCompanionComputedAtMs: null,
    perfectCompanionModelVersion: null,
    perfectCompanionComputedCycleIndex: null,
    activeStopIndex: 0,
    activeStopType: 'hatchery',
    stopStatesByIndex: Array.from({ length: 5 }, () => ({
      objectiveComplete: false,
      buildComplete: false,
    })),
    stopBuildStateByIndex: Array.from({ length: 5 }, () => ({
      requiredEssence: 100,
      spentEssence: 0,
      buildLevel: 0,
    })),
    bossState: {
      unlocked: false,
      objectiveComplete: false,
      buildComplete: false,
    },
    essence: 0,
    essenceLifetimeEarned: 0,
    essenceLifetimeSpent: 0,
    diceRegenState: null,
    rewardBarProgress: 0,
    rewardBarThreshold: 10,
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
    lastEssenceDriftLost: 0,
  };
}

/**
 * Resets the player's Island Run progress to a fresh start.
 *
 * Returns `{ ok: true }` on success or `{ ok: false; errorMessage: string }` on failure.
 *
 * This does NOT affect:
 * - XP, Level, or Streaks (stored in gamification_profiles — separate system)
 * - Journals, habits, telemetry, achievements, or any other app data
 */
export async function resetIslandRunProgress(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client } = options;

  // Read current state to preserve user preferences.
  const current = readIslandRunGameStateRecord(session);

  const freshRecord = buildFreshIslandRunRecord({
    audioEnabled: current.audioEnabled,
    onboardingDisplayNameLoopCompleted: current.onboardingDisplayNameLoopCompleted,
  });

  return writeIslandRunGameStateRecord({
    session,
    client,
    record: freshRecord,
    triggerSource: 'island_run_progress_reset',
  });
}
