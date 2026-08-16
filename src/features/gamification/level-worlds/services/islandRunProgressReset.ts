/**
 * islandRunProgressReset — Resets the player's Island Run game progress
 * to a fresh start (island 1, starting dice/essence, clean stops) and
 * resets their XP/level back to 1.
 *
 * **What is reset:**
 * - Island position → island 1, tile 0
 * - Currencies → starting dice (30), 0 essence, 3 diamonds, 0 shards
 * - Stops, boss, reward bar, Concord and island missions → default/empty
 * - Eggs, egg reward inventory, creatures → default/empty by default; optional preserve
 * - Onboarding flags (firstRunClaimed, storyPrologueSeen) → false
 * - By default, persisted creature collection + active companion (localStorage:
 *   `island_run_creature_collection_*`, `island_run_active_companion_*`)
 * - By default, persisted creature-treat inventory (localStorage:
 *   `island_run_creature_treat_inventory_*`) — kept in sync with the
 *   runtime record's reset `creatureTreatInventory` defaults.
 * - XP → 0, Level → 1 (gamification_profiles / demo localStorage)
 *
 * **What is preserved (user preferences):**
 * - audioEnabled (world ambience), musicEnabled, sfxEnabled
 * - onboardingDisplayNameLoopCompleted (display name already set)
 *
 * **What is NOT touched (separate systems):**
 * - Journals, habits, telemetry, achievements, identity data
 * - Streak data, lives, power-ups
 * - XP transaction history (preserved as a historical log)
 * - Compass Book (unless explicitly selected in the reset confirmation)
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from './islandRunEconomy';
import {
  ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE,
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
} from './islandRunGameStateStore';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { createEmptyIslandNarrativeSeenState } from '../narrative/islandNarrativeSeenState';
import { resetIslandRunStateSnapshot } from './islandRunStateStore';
import { clearCreatureCollectionForUser } from './creatureCollectionService';
import { clearCreatureTreatInventoryForUser } from './creatureTreatInventoryService';
import { resetXP } from '../../../../services/gamification';
import { resetCompassBookForUser } from '../../../compass-book/services/compassBookService';

export type IslandRunProgressResetChoices = {
  /** Clear collected creatures, active/pending eggs, companion state, and treats. */
  resetCreaturesAndEggs: boolean;
  /** Clear the separate six-chapter Compass Book and all its answers. */
  resetCompassBook: boolean;
};

export const DEFAULT_ISLAND_RUN_PROGRESS_RESET_CHOICES: IslandRunProgressResetChoices = {
  resetCreaturesAndEggs: true,
  resetCompassBook: false,
};

/**
 * Builds a fresh Island Run game state record, preserving only user
 * preferences (audio, display name completion) from the current state.
 */
export function buildFreshIslandRunRecord(
  current: Pick<IslandRunGameStateRecord, 'audioEnabled' | 'onboardingDisplayNameLoopCompleted'> &
    Partial<Pick<IslandRunGameStateRecord, 'musicEnabled' | 'sfxEnabled'>>,
): IslandRunGameStateRecord {
  const nowMs = Date.now();
  return {
    runtimeVersion: 0,
    firstRunClaimed: false,
    selectedPlayerPieceId: null,
    firstSessionTutorialState: ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE,
    dailyHeartsClaimedDayKey: null,
    onboardingDisplayNameLoopCompleted: current.onboardingDisplayNameLoopCompleted,
    welcomePackClaimed: false,
    welcomePackRewardBundleClaimed: false,
    storyPrologueSeen: false,
    narrativeSeenState: createEmptyIslandNarrativeSeenState(),
    // audioEnabled is the persisted compatibility field for world ambience.
    audioEnabled: current.audioEnabled,
    musicEnabled: current.musicEnabled ?? current.audioEnabled,
    sfxEnabled: current.sfxEnabled ?? current.audioEnabled,
    currentIslandNumber: 1,
    cycleIndex: 0,
    bossTrialResolvedIslandNumber: null,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {},
    eggRewardInventory: [],
    islandStartedAtMs: nowMs,
    islandExpiresAtMs: nowMs + 48 * 60 * 60 * 1000,
    islandShards: 0,
    tokenIndex: 0,
    spinTokens: 0,
    dicePool: ISLAND_RUN_DEFAULT_STARTING_DICE,
    bonusMaxDice: 0,
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
    bonusTileChargeByIsland: {},
    techCollectionByIsland: {},
    concordRollProtectionState: { rollsTaken: 0, rollsSinceFragment: 0 },
    techCollectionRewardedLinesByIsland: {},
    technologyUnlocksById: {},
    signatureMissionProgressByIsland: {},
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
    minigameTicketsByEvent: {},
    arenaFirstTicketBoostClaimedByEvent: {},
    luckyRollSessionsByMilestone: {},
    spaceExcavatorProgressByEvent: {},
    companionFeastProgressByEvent: {},
    fortuneEngineProgressByEvent: {},
    journeyDiscArenaProgressByEvent: {},
    journeyDiscArmory: { version: 1, rank: 1, weaponLevels: { ram_fin: 1, aegis_ring: 0, pulse_vane: 0 }, highestGuardianTierDefeated: 0, updatedAtMs: Date.now() },
    momentumMatrixProgressByEvent: {},
  };
}

/**
 * Build the canonical reset record, optionally carrying the separate creature
 * ecosystem into the new Island 1 run. Island progression itself (including
 * Concord fragments/build state) is always reset.
 */
export function buildIslandRunResetRecord(
  current: IslandRunGameStateRecord,
  choices: Pick<IslandRunProgressResetChoices, 'resetCreaturesAndEggs'>,
): IslandRunGameStateRecord {
  const fresh = buildFreshIslandRunRecord({
    audioEnabled: current.audioEnabled,
    musicEnabled: current.musicEnabled ?? current.audioEnabled,
    sfxEnabled: current.sfxEnabled ?? current.audioEnabled,
    onboardingDisplayNameLoopCompleted: current.onboardingDisplayNameLoopCompleted,
  });

  if (choices.resetCreaturesAndEggs) return fresh;

  return {
    ...fresh,
    activeEggTier: current.activeEggTier,
    activeEggSetAtMs: current.activeEggSetAtMs,
    activeEggHatchDurationMs: current.activeEggHatchDurationMs,
    activeEggIsDormant: current.activeEggIsDormant,
    perIslandEggs: current.perIslandEggs,
    eggRewardInventory: current.eggRewardInventory,
    creatureTreatInventory: current.creatureTreatInventory,
    companionBonusLastVisitKey: current.companionBonusLastVisitKey,
    creatureCollection: current.creatureCollection,
    activeCompanionId: current.activeCompanionId,
    perfectCompanionIds: current.perfectCompanionIds,
    perfectCompanionReasons: current.perfectCompanionReasons,
    perfectCompanionComputedAtMs: current.perfectCompanionComputedAtMs,
    perfectCompanionModelVersion: current.perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex: current.perfectCompanionComputedCycleIndex,
  };
}

/**
 * Resets the player's Island Run progress to a fresh start and resets
 * their XP and level to 1.
 *
 * Returns `{ ok: true }` on success or `{ ok: false; errorMessage: string }` on failure.
 *
 * This does NOT affect:
 * - Journals, habits, telemetry, achievements, or any other app data
 * - Streak data, lives, power-ups
 * - XP transaction history (preserved as a historical log)
 */
export async function resetIslandRunProgress(options: {
  session: Session;
  client: SupabaseClient | null;
  choices?: Partial<IslandRunProgressResetChoices>;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client } = options;
  const choices: IslandRunProgressResetChoices = {
    ...DEFAULT_ISLAND_RUN_PROGRESS_RESET_CHOICES,
    ...options.choices,
  };

  // Reset XP and level first. If this fails we bail before touching island state.
  const xpResetResult = await resetXP(session.user.id);
  if (!xpResetResult.ok) {
    return xpResetResult;
  }

  // Read current state to preserve user preferences.
  const current = readIslandRunGameStateRecord(session);

  const freshRecord = buildIslandRunResetRecord(current, choices);

  const persistResult = await writeIslandRunGameStateRecord({
    session,
    client,
    record: freshRecord,
    skipQueueReplay: true,
    triggerSource: 'island_run_progress_reset',
    conflictMode: 'replace',
  });

  if (!persistResult.ok) return persistResult;

  if (choices.resetCreaturesAndEggs) {
    // Clear the two legacy/local mirrors only after the canonical write has
    // accepted the reset. This avoids a partial local creature wipe if remote
    // runtime persistence fails.
    clearCreatureCollectionForUser(session.user.id);
    clearCreatureTreatInventoryForUser(session.user.id);
  }

  // Keep the in-memory state store in sync so active Island Run screens reset
  // immediately without requiring a manual refresh.
  const persistedFreshRecord = readIslandRunGameStateRecord(session);
  resetIslandRunStateSnapshot(session, persistedFreshRecord);

  if (choices.resetCompassBook) {
    const compassResult = await resetCompassBookForUser({
      userId: session.user.id,
      client,
    });
    if (!compassResult.ok) {
      return {
        ok: false,
        errorMessage: `Island Run was reset, but the Compass Book could not be cleared: ${compassResult.errorMessage}`,
      };
    }
  }

  return { ok: true };
}
