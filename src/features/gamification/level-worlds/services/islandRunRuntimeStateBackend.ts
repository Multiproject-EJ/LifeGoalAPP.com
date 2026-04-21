import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { persistIslandRunProfileMetadata } from './islandRunProfile';
import type { IslandRunRuntimeState } from './islandRunRuntimeState';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import type {
  CreatureCollectionRuntimeEntry,
  PerIslandEggsLedger,
  PerfectCompanionReason,
} from './islandRunGameStateStore';
import {
  deriveIslandRunContractV2StopType,
  hydrateIslandRunGameStateRecord,
  hydrateIslandRunGameStateRecordWithSource,
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import {
  clampBonusCharge,
  type BonusTileChargeByIsland,
} from './islandRunBonusTile';

export interface IslandRunRuntimeStateBackend {
  read(session: Session): IslandRunRuntimeState;
  hydrate(options: { session: Session; client: SupabaseClient | null; forceRemote?: boolean }): Promise<IslandRunRuntimeState>;
  hydrateWithSource(options: {
    session: Session;
    client: SupabaseClient | null;
    forceRemote?: boolean;
  }): Promise<{
    state: IslandRunRuntimeState;
    source: IslandRunRuntimeHydrationSource;
  }>;
  persistPatch(options: {
    session: Session;
    client: SupabaseClient | null;
    patch: {
      firstRunClaimed?: boolean;
      dailyHeartsClaimedDayKey?: string | null;
      onboardingDisplayNameLoopCompleted?: boolean;
      storyPrologueSeen?: boolean;
      audioEnabled?: boolean;
      onboardingComplete?: boolean;
      currentIslandNumber?: number;
      cycleIndex?: number;
      bossTrialResolvedIslandNumber?: number | null;
      activeEggTier?: 'common' | 'rare' | 'mythic' | null;
      activeEggSetAtMs?: number | null;
      activeEggHatchDurationMs?: number | null;
      activeEggIsDormant?: boolean;
      perIslandEggs?: PerIslandEggsLedger;
      islandStartedAtMs?: number;
      islandExpiresAtMs?: number;
      islandShards?: number;
      tokenIndex?: number;
      spinTokens?: number;
      dicePool?: number;
      shardTierIndex?: number;
      shardClaimCount?: number;
      shields?: number;
      shards?: number;
      diamonds?: number;
      creatureTreatInventory?: {
        basic: number;
        favorite: number;
        rare: number;
      };
      companionBonusLastVisitKey?: string | null;
      completedStopsByIsland?: Record<string, string[]>;
      stopTicketsPaidByIsland?: Record<string, number[]>;
      bonusTileChargeByIsland?: BonusTileChargeByIsland;
      marketOwnedBundlesByIsland?: Record<string, {
        dice_bundle: boolean;
        heart_bundle: boolean;
        heart_boost_bundle: boolean;
      }>;
      creatureCollection?: CreatureCollectionRuntimeEntry[];
      activeCompanionId?: string | null;
      perfectCompanionIds?: string[];
      perfectCompanionReasons?: Record<string, PerfectCompanionReason>;
      perfectCompanionComputedAtMs?: number | null;
      perfectCompanionModelVersion?: string | null;
      perfectCompanionComputedCycleIndex?: number | null;
      activeStopIndex?: number;
      activeStopType?: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
      stopStatesByIndex?: Array<{ objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number }>;
      stopBuildStateByIndex?: Array<{ requiredEssence: number; spentEssence: number; buildLevel: number }>;
      bossState?: { unlocked: boolean; objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number };
      essence?: number;
      essenceLifetimeEarned?: number;
      essenceLifetimeSpent?: number;
      diceRegenState?: { maxDice: number; regenRatePerHour: number; lastRegenAtMs: number } | null;
      rewardBarProgress?: number;
      rewardBarThreshold?: number;
      rewardBarClaimCountInEvent?: number;
      rewardBarEscalationTier?: number;
      rewardBarLastClaimAtMs?: number | null;
      rewardBarBoundEventId?: string | null;
      rewardBarLadderId?: string | null;
      activeTimedEvent?: { eventId: string; eventType: string; startedAtMs: number; expiresAtMs: number; version: number } | null;
      activeTimedEventProgress?: { feedingActions: number; tokensEarned: number; milestonesClaimed: number };
      stickerProgress?: { fragments: number; guaranteedAt?: number; pityCounter?: number };
      stickerInventory?: Record<string, number>;
      lastEssenceDriftLost?: number;
      minigameTicketsByEvent?: Record<string, number>;
    };
  }): Promise<{ ok: true } | { ok: false; errorMessage: string }>;
}

const gameStateStorageBackend: IslandRunRuntimeStateBackend = {
  read(session) {
    return readIslandRunGameStateRecord(session);
  },

  async hydrate({ session, client, forceRemote }) {
    return hydrateIslandRunGameStateRecord({ session, client, forceRemote });
  },

  async hydrateWithSource({ session, client, forceRemote }) {
    const result = await hydrateIslandRunGameStateRecordWithSource({ session, client, forceRemote });
    return { state: result.record, source: result.source };
  },

  async persistPatch({ session, client, patch }) {
    const hydratedBase = await hydrateIslandRunGameStateRecord({ session, client });
    // Re-read local storage after the async network round-trip. Another writer
    // (e.g. the roll service or the completedStops persist effect in the board
    // component) may have updated localStorage while we awaited Supabase. If the
    // fresh local record is at least as new as the hydrated result we use it as
    // the merge base, so the patch is never applied on top of a stale snapshot
    // that would clobber a newer tokenIndex, completedStopsByIsland, etc.
    const freshLocal = readIslandRunGameStateRecord(session);
    const current: IslandRunGameStateRecord =
      freshLocal.runtimeVersion >= hydratedBase.runtimeVersion ? freshLocal : hydratedBase;
    const nextActiveStopIndex =
      typeof patch.activeStopIndex === 'number' && Number.isFinite(patch.activeStopIndex)
        ? Math.max(0, Math.min(4, Math.floor(patch.activeStopIndex)))
        : current.activeStopIndex;
    const nextState: IslandRunRuntimeState = {
      runtimeVersion: current.runtimeVersion,
      firstRunClaimed: typeof patch.firstRunClaimed === 'boolean' ? patch.firstRunClaimed : current.firstRunClaimed,
      dailyHeartsClaimedDayKey:
        typeof patch.dailyHeartsClaimedDayKey === 'string' || patch.dailyHeartsClaimedDayKey === null
          ? patch.dailyHeartsClaimedDayKey
          : current.dailyHeartsClaimedDayKey,
      onboardingDisplayNameLoopCompleted:
        typeof patch.onboardingDisplayNameLoopCompleted === 'boolean'
          ? patch.onboardingDisplayNameLoopCompleted
          : current.onboardingDisplayNameLoopCompleted,
      storyPrologueSeen:
        typeof patch.storyPrologueSeen === 'boolean'
          ? patch.storyPrologueSeen
          : current.storyPrologueSeen,
      audioEnabled:
        typeof patch.audioEnabled === 'boolean'
          ? patch.audioEnabled
          : current.audioEnabled,
      currentIslandNumber:
        typeof patch.currentIslandNumber === 'number' && Number.isFinite(patch.currentIslandNumber)
          ? Math.max(1, Math.floor(patch.currentIslandNumber))
          : current.currentIslandNumber,
      cycleIndex:
        typeof patch.cycleIndex === 'number' && Number.isFinite(patch.cycleIndex)
          ? Math.max(0, Math.floor(patch.cycleIndex))
          : current.cycleIndex,
      bossTrialResolvedIslandNumber:
        typeof patch.bossTrialResolvedIslandNumber === 'number' && Number.isFinite(patch.bossTrialResolvedIslandNumber)
          ? Math.max(1, Math.floor(patch.bossTrialResolvedIslandNumber))
          : patch.bossTrialResolvedIslandNumber === null
            ? null
            : current.bossTrialResolvedIslandNumber,
      activeEggTier:
        patch.activeEggTier === null || patch.activeEggTier === 'common' || patch.activeEggTier === 'rare' || patch.activeEggTier === 'mythic'
          ? patch.activeEggTier
          : 'activeEggTier' in patch
            ? null
            : current.activeEggTier,
      activeEggSetAtMs:
        typeof patch.activeEggSetAtMs === 'number' && Number.isFinite(patch.activeEggSetAtMs)
          ? patch.activeEggSetAtMs
          : patch.activeEggSetAtMs === null
            ? null
            : current.activeEggSetAtMs,
      activeEggHatchDurationMs:
        typeof patch.activeEggHatchDurationMs === 'number' && Number.isFinite(patch.activeEggHatchDurationMs)
          ? patch.activeEggHatchDurationMs
          : patch.activeEggHatchDurationMs === null
            ? null
            : current.activeEggHatchDurationMs,
      activeEggIsDormant:
        typeof patch.activeEggIsDormant === 'boolean' ? patch.activeEggIsDormant : current.activeEggIsDormant,
      perIslandEggs: patch.perIslandEggs
        ? { ...current.perIslandEggs, ...patch.perIslandEggs }
        : current.perIslandEggs,
      islandStartedAtMs:
        typeof patch.islandStartedAtMs === 'number' && Number.isFinite(patch.islandStartedAtMs)
          ? patch.islandStartedAtMs
          : current.islandStartedAtMs,
      islandExpiresAtMs:
        typeof patch.islandExpiresAtMs === 'number' && Number.isFinite(patch.islandExpiresAtMs)
          ? patch.islandExpiresAtMs
          : current.islandExpiresAtMs,
      islandShards:
        typeof patch.islandShards === 'number' && Number.isFinite(patch.islandShards)
          ? Math.max(0, Math.floor(patch.islandShards))
          : current.islandShards,
      tokenIndex:
        typeof patch.tokenIndex === 'number' && Number.isFinite(patch.tokenIndex)
          ? Math.max(0, Math.floor(patch.tokenIndex))
          : current.tokenIndex,
      spinTokens:
        typeof patch.spinTokens === 'number' && Number.isFinite(patch.spinTokens)
          ? Math.max(0, Math.floor(patch.spinTokens))
          : current.spinTokens,
      dicePool:
        typeof patch.dicePool === 'number' && Number.isFinite(patch.dicePool)
          ? Math.max(0, Math.floor(patch.dicePool))
          : current.dicePool,
      shardTierIndex:
        typeof patch.shardTierIndex === 'number' && Number.isFinite(patch.shardTierIndex)
          ? Math.max(0, Math.floor(patch.shardTierIndex))
          : current.shardTierIndex,
      shardClaimCount:
        typeof patch.shardClaimCount === 'number' && Number.isFinite(patch.shardClaimCount)
          ? Math.max(0, Math.floor(patch.shardClaimCount))
          : current.shardClaimCount,
      shields:
        typeof patch.shields === 'number' && Number.isFinite(patch.shields)
          ? Math.max(0, Math.floor(patch.shields))
          : current.shields,
      shards:
        typeof patch.shards === 'number' && Number.isFinite(patch.shards)
          ? Math.max(0, Math.floor(patch.shards))
          : current.shards,
      diamonds:
        typeof patch.diamonds === 'number' && Number.isFinite(patch.diamonds)
          ? Math.max(0, Math.floor(patch.diamonds))
          : current.diamonds,
      creatureTreatInventory:
        patch.creatureTreatInventory !== null && typeof patch.creatureTreatInventory === 'object' && !Array.isArray(patch.creatureTreatInventory)
          ? {
              basic: typeof patch.creatureTreatInventory.basic === 'number' && Number.isFinite(patch.creatureTreatInventory.basic)
                ? Math.max(0, Math.floor(patch.creatureTreatInventory.basic))
                : current.creatureTreatInventory.basic,
              favorite: typeof patch.creatureTreatInventory.favorite === 'number' && Number.isFinite(patch.creatureTreatInventory.favorite)
                ? Math.max(0, Math.floor(patch.creatureTreatInventory.favorite))
                : current.creatureTreatInventory.favorite,
              rare: typeof patch.creatureTreatInventory.rare === 'number' && Number.isFinite(patch.creatureTreatInventory.rare)
                ? Math.max(0, Math.floor(patch.creatureTreatInventory.rare))
                : current.creatureTreatInventory.rare,
            }
          : current.creatureTreatInventory,
      companionBonusLastVisitKey:
        typeof patch.companionBonusLastVisitKey === 'string' || patch.companionBonusLastVisitKey === null
          ? patch.companionBonusLastVisitKey
          : current.companionBonusLastVisitKey,
      completedStopsByIsland:
        patch.completedStopsByIsland !== null && typeof patch.completedStopsByIsland === 'object' && !Array.isArray(patch.completedStopsByIsland)
          ? {
              ...current.completedStopsByIsland,
              ...Object.fromEntries(
                Object.entries(patch.completedStopsByIsland).map(([islandKey, stops]) => [
                  islandKey,
                  Array.isArray(stops) ? stops.filter((stop): stop is string => typeof stop === 'string') : [],
                ]),
              ),
            }
          : current.completedStopsByIsland,
      stopTicketsPaidByIsland:
        patch.stopTicketsPaidByIsland !== null && typeof patch.stopTicketsPaidByIsland === 'object' && !Array.isArray(patch.stopTicketsPaidByIsland)
          ? {
              ...current.stopTicketsPaidByIsland,
              ...Object.fromEntries(
                Object.entries(patch.stopTicketsPaidByIsland).map(([islandKey, ticketIndices]) => [
                  islandKey,
                  Array.isArray(ticketIndices)
                    ? Array.from(
                        new Set(
                          ticketIndices
                            .map((v) => Math.floor(v as number))
                            .filter((v) => Number.isFinite(v) && v > 0 && v < 5),
                        ),
                      ).sort((a, b) => a - b)
                    : [],
                ]),
              ),
            }
          : current.stopTicketsPaidByIsland,
      bonusTileChargeByIsland:
        // Overlay merge per island key — matches `stopTicketsPaidByIsland`
        // semantics. Value clamping mirrors `sanitizeBonusTileChargeByIsland`
        // but explicit-empty inner maps are preserved so callers can clear an
        // island's entry by patching with `{ [islandKey]: {} }` (required by
        // `performIslandTravel` when wrapping a cycle, where we must drop the
        // previous cycle's bonus-tile charges).
        patch.bonusTileChargeByIsland !== null && typeof patch.bonusTileChargeByIsland === 'object' && !Array.isArray(patch.bonusTileChargeByIsland)
          ? {
              ...current.bonusTileChargeByIsland,
              ...Object.fromEntries(
                Object.entries(patch.bonusTileChargeByIsland).map(([islandKey, inner]) => {
                  if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return [islandKey, {}];
                  const innerCopy: Record<number, number> = {};
                  for (const [idxKey, chargeRaw] of Object.entries(inner)) {
                    const idx = Number(idxKey);
                    if (!Number.isFinite(idx) || idx < 0) continue;
                    const normalized = clampBonusCharge(chargeRaw as number);
                    if (normalized > 0) innerCopy[Math.floor(idx)] = normalized;
                  }
                  return [islandKey, innerCopy];
                }),
              ),
            }
          : current.bonusTileChargeByIsland,
      marketOwnedBundlesByIsland:
        patch.marketOwnedBundlesByIsland !== null && typeof patch.marketOwnedBundlesByIsland === 'object' && !Array.isArray(patch.marketOwnedBundlesByIsland)
          ? {
              ...current.marketOwnedBundlesByIsland,
              ...Object.fromEntries(
                Object.entries(patch.marketOwnedBundlesByIsland).map(([islandKey, bundles]) => [
                  islandKey,
                  bundles !== null && typeof bundles === 'object' && !Array.isArray(bundles)
                    ? {
                        dice_bundle: Boolean((bundles as Record<string, unknown>).dice_bundle),
                        heart_bundle: Boolean((bundles as Record<string, unknown>).heart_bundle),
                        heart_boost_bundle: Boolean((bundles as Record<string, unknown>).heart_boost_bundle),
                      }
                    : {
                        dice_bundle: false,
                        heart_bundle: false,
                        heart_boost_bundle: false,
                      },
                ]),
              ),
            }
          : current.marketOwnedBundlesByIsland,
      creatureCollection:
        Array.isArray(patch.creatureCollection)
          ? patch.creatureCollection
          : current.creatureCollection,
      activeCompanionId:
        typeof patch.activeCompanionId === 'string' || patch.activeCompanionId === null
          ? patch.activeCompanionId
          : current.activeCompanionId,
      perfectCompanionIds:
        Array.isArray(patch.perfectCompanionIds)
          ? patch.perfectCompanionIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          : current.perfectCompanionIds,
      perfectCompanionReasons:
        patch.perfectCompanionReasons !== null && typeof patch.perfectCompanionReasons === 'object' && !Array.isArray(patch.perfectCompanionReasons)
          ? Object.fromEntries(
              Object.entries(patch.perfectCompanionReasons).map(([creatureId, reason]) => [
                creatureId,
                reason !== null && typeof reason === 'object' && !Array.isArray(reason)
                  ? {
                      strength: Array.isArray((reason as unknown as Record<string, unknown>).strength)
                        ? ((reason as unknown as Record<string, unknown>).strength as unknown[])
                            .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
                        : [],
                      weaknessSupport: Array.isArray((reason as unknown as Record<string, unknown>).weaknessSupport)
                        ? ((reason as unknown as Record<string, unknown>).weaknessSupport as unknown[])
                            .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
                        : [],
                      zoneMatch: Boolean((reason as unknown as Record<string, unknown>).zoneMatch),
                    }
                  : {
                      strength: [],
                      weaknessSupport: [],
                      zoneMatch: false,
                    },
              ]),
            )
          : current.perfectCompanionReasons,
      perfectCompanionComputedAtMs:
        typeof patch.perfectCompanionComputedAtMs === 'number' && Number.isFinite(patch.perfectCompanionComputedAtMs)
          ? patch.perfectCompanionComputedAtMs
          : patch.perfectCompanionComputedAtMs === null
            ? null
            : current.perfectCompanionComputedAtMs,
      perfectCompanionModelVersion:
        typeof patch.perfectCompanionModelVersion === 'string' || patch.perfectCompanionModelVersion === null
          ? patch.perfectCompanionModelVersion
          : current.perfectCompanionModelVersion,
      perfectCompanionComputedCycleIndex:
        typeof patch.perfectCompanionComputedCycleIndex === 'number' && Number.isFinite(patch.perfectCompanionComputedCycleIndex)
          ? Math.max(0, Math.floor(patch.perfectCompanionComputedCycleIndex))
          : patch.perfectCompanionComputedCycleIndex === null
            ? null
            : current.perfectCompanionComputedCycleIndex,
      activeStopIndex:
        nextActiveStopIndex,
      activeStopType:
        patch.activeStopType === 'hatchery'
        || patch.activeStopType === 'habit'
        || patch.activeStopType === 'mystery'
        || patch.activeStopType === 'wisdom'
        || patch.activeStopType === 'boss'
          ? patch.activeStopType
          : 'activeStopType' in patch
            ? deriveIslandRunContractV2StopType(
                nextActiveStopIndex,
              )
            : ('activeStopIndex' in patch ? deriveIslandRunContractV2StopType(nextActiveStopIndex) : current.activeStopType),
      stopStatesByIndex:
        Array.isArray(patch.stopStatesByIndex)
          ? Array.from({ length: 5 }, (_, index) => {
              const entry = patch.stopStatesByIndex?.[index];
              const fallbackEntry = current.stopStatesByIndex[index] ?? { objectiveComplete: false, buildComplete: false };
              if (!entry) return fallbackEntry;
              return {
                objectiveComplete: entry.objectiveComplete === true,
                buildComplete: entry.buildComplete === true,
                ...(typeof entry.completedAtMs === 'number' && Number.isFinite(entry.completedAtMs)
                  ? { completedAtMs: entry.completedAtMs }
                  : {}),
              };
            })
          : current.stopStatesByIndex,
      stopBuildStateByIndex:
        Array.isArray(patch.stopBuildStateByIndex)
          ? Array.from({ length: 5 }, (_, index) => {
              const entry = patch.stopBuildStateByIndex?.[index];
              const fallbackEntry = current.stopBuildStateByIndex[index] ?? { requiredEssence: 0, spentEssence: 0, buildLevel: 0 };
              if (!entry) return fallbackEntry;
              return {
                requiredEssence:
                  typeof entry.requiredEssence === 'number' && Number.isFinite(entry.requiredEssence)
                    ? Math.max(0, Math.floor(entry.requiredEssence))
                    : fallbackEntry.requiredEssence,
                spentEssence:
                  typeof entry.spentEssence === 'number' && Number.isFinite(entry.spentEssence)
                    ? Math.max(0, Math.floor(entry.spentEssence))
                    : fallbackEntry.spentEssence,
                buildLevel:
                  typeof entry.buildLevel === 'number' && Number.isFinite(entry.buildLevel)
                    ? Math.max(0, Math.floor(entry.buildLevel))
                    : fallbackEntry.buildLevel,
              };
            })
          : current.stopBuildStateByIndex,
      bossState:
        patch.bossState !== null && typeof patch.bossState === 'object' && !Array.isArray(patch.bossState)
          ? {
              unlocked: Boolean(patch.bossState.unlocked),
              objectiveComplete: Boolean(patch.bossState.objectiveComplete),
              buildComplete: Boolean(patch.bossState.buildComplete),
              ...(typeof patch.bossState.completedAtMs === 'number' && Number.isFinite(patch.bossState.completedAtMs)
                ? { completedAtMs: patch.bossState.completedAtMs }
                : {}),
            }
          : current.bossState,
      essence:
        typeof patch.essence === 'number' && Number.isFinite(patch.essence)
          ? Math.max(0, Math.floor(patch.essence))
          : current.essence,
      essenceLifetimeEarned:
        typeof patch.essenceLifetimeEarned === 'number' && Number.isFinite(patch.essenceLifetimeEarned)
          ? Math.max(0, Math.floor(patch.essenceLifetimeEarned))
          : current.essenceLifetimeEarned,
      essenceLifetimeSpent:
        typeof patch.essenceLifetimeSpent === 'number' && Number.isFinite(patch.essenceLifetimeSpent)
          ? Math.max(0, Math.floor(patch.essenceLifetimeSpent))
          : current.essenceLifetimeSpent,
      diceRegenState:
        patch.diceRegenState !== null
        && typeof patch.diceRegenState === 'object'
        && !Array.isArray(patch.diceRegenState)
        && typeof patch.diceRegenState.maxDice === 'number'
        && Number.isFinite(patch.diceRegenState.maxDice)
        && typeof patch.diceRegenState.regenRatePerHour === 'number'
        && Number.isFinite(patch.diceRegenState.regenRatePerHour)
        && typeof patch.diceRegenState.lastRegenAtMs === 'number'
        && Number.isFinite(patch.diceRegenState.lastRegenAtMs)
          ? {
              maxDice: Math.max(0, Math.floor(patch.diceRegenState.maxDice)),
              regenRatePerHour: Math.max(0, patch.diceRegenState.regenRatePerHour),
              lastRegenAtMs: patch.diceRegenState.lastRegenAtMs,
            }
          : patch.diceRegenState === null
            ? null
          : current.diceRegenState,
      rewardBarProgress:
        typeof patch.rewardBarProgress === 'number' && Number.isFinite(patch.rewardBarProgress)
          ? Math.max(0, Math.floor(patch.rewardBarProgress))
          : current.rewardBarProgress,
      rewardBarThreshold:
        typeof patch.rewardBarThreshold === 'number' && Number.isFinite(patch.rewardBarThreshold)
          ? Math.max(1, Math.floor(patch.rewardBarThreshold))
          : current.rewardBarThreshold,
      rewardBarClaimCountInEvent:
        typeof patch.rewardBarClaimCountInEvent === 'number' && Number.isFinite(patch.rewardBarClaimCountInEvent)
          ? Math.max(0, Math.floor(patch.rewardBarClaimCountInEvent))
          : current.rewardBarClaimCountInEvent,
      rewardBarEscalationTier:
        typeof patch.rewardBarEscalationTier === 'number' && Number.isFinite(patch.rewardBarEscalationTier)
          ? Math.max(0, Math.floor(patch.rewardBarEscalationTier))
          : current.rewardBarEscalationTier,
      rewardBarLastClaimAtMs:
        typeof patch.rewardBarLastClaimAtMs === 'number' && Number.isFinite(patch.rewardBarLastClaimAtMs)
          ? patch.rewardBarLastClaimAtMs
          : patch.rewardBarLastClaimAtMs === null
            ? null
            : current.rewardBarLastClaimAtMs,
      rewardBarBoundEventId:
        typeof patch.rewardBarBoundEventId === 'string' || patch.rewardBarBoundEventId === null
          ? patch.rewardBarBoundEventId
          : current.rewardBarBoundEventId,
      rewardBarLadderId:
        typeof patch.rewardBarLadderId === 'string'
          ? patch.rewardBarLadderId
          : patch.rewardBarLadderId === null
            ? null
          : current.rewardBarLadderId,
      activeTimedEvent:
        patch.activeTimedEvent !== null
        && typeof patch.activeTimedEvent === 'object'
        && !Array.isArray(patch.activeTimedEvent)
        && typeof patch.activeTimedEvent.eventId === 'string'
        && typeof patch.activeTimedEvent.eventType === 'string'
        && typeof patch.activeTimedEvent.startedAtMs === 'number'
        && Number.isFinite(patch.activeTimedEvent.startedAtMs)
        && typeof patch.activeTimedEvent.expiresAtMs === 'number'
        && Number.isFinite(patch.activeTimedEvent.expiresAtMs)
        && typeof patch.activeTimedEvent.version === 'number'
        && Number.isFinite(patch.activeTimedEvent.version)
          ? {
              eventId: patch.activeTimedEvent.eventId,
              eventType: patch.activeTimedEvent.eventType,
              startedAtMs: patch.activeTimedEvent.startedAtMs,
              expiresAtMs: patch.activeTimedEvent.expiresAtMs,
              version: Math.max(0, Math.floor(patch.activeTimedEvent.version)),
            }
          : patch.activeTimedEvent === null
            ? null
            : current.activeTimedEvent,
      activeTimedEventProgress:
        patch.activeTimedEventProgress !== null
        && typeof patch.activeTimedEventProgress === 'object'
        && !Array.isArray(patch.activeTimedEventProgress)
          ? {
              feedingActions:
                typeof patch.activeTimedEventProgress.feedingActions === 'number' && Number.isFinite(patch.activeTimedEventProgress.feedingActions)
                  ? Math.max(0, Math.floor(patch.activeTimedEventProgress.feedingActions))
                  : current.activeTimedEventProgress.feedingActions,
              tokensEarned:
                typeof patch.activeTimedEventProgress.tokensEarned === 'number' && Number.isFinite(patch.activeTimedEventProgress.tokensEarned)
                  ? Math.max(0, Math.floor(patch.activeTimedEventProgress.tokensEarned))
                  : current.activeTimedEventProgress.tokensEarned,
              milestonesClaimed:
                typeof patch.activeTimedEventProgress.milestonesClaimed === 'number' && Number.isFinite(patch.activeTimedEventProgress.milestonesClaimed)
                  ? Math.max(0, Math.floor(patch.activeTimedEventProgress.milestonesClaimed))
                  : current.activeTimedEventProgress.milestonesClaimed,
            }
          : current.activeTimedEventProgress,
      stickerProgress:
        patch.stickerProgress !== null && typeof patch.stickerProgress === 'object' && !Array.isArray(patch.stickerProgress)
          ? {
              fragments:
                typeof patch.stickerProgress.fragments === 'number' && Number.isFinite(patch.stickerProgress.fragments)
                  ? Math.max(0, Math.floor(patch.stickerProgress.fragments))
                  : current.stickerProgress.fragments,
              ...(typeof patch.stickerProgress.guaranteedAt === 'number' && Number.isFinite(patch.stickerProgress.guaranteedAt)
                ? { guaranteedAt: Math.max(0, Math.floor(patch.stickerProgress.guaranteedAt)) }
                : {}),
              ...(typeof patch.stickerProgress.pityCounter === 'number' && Number.isFinite(patch.stickerProgress.pityCounter)
                ? { pityCounter: Math.max(0, Math.floor(patch.stickerProgress.pityCounter)) }
                : {}),
            }
          : current.stickerProgress,
      stickerInventory:
        patch.stickerInventory !== null && typeof patch.stickerInventory === 'object' && !Array.isArray(patch.stickerInventory)
          ? {
              ...current.stickerInventory,
              ...Object.fromEntries(
                Object.entries(patch.stickerInventory)
                  .filter(([key, count]) => typeof key === 'string' && typeof count === 'number' && Number.isFinite(count))
                  .map(([key, count]) => [key, Math.max(0, Math.floor(count))]),
              ),
            }
          : current.stickerInventory,
      lastEssenceDriftLost:
        typeof patch.lastEssenceDriftLost === 'number' && Number.isFinite(patch.lastEssenceDriftLost)
          ? Math.max(0, Math.floor(patch.lastEssenceDriftLost))
          : current.lastEssenceDriftLost,
      minigameTicketsByEvent:
        patch.minigameTicketsByEvent !== null
        && patch.minigameTicketsByEvent !== undefined
        && typeof patch.minigameTicketsByEvent === 'object'
        && !Array.isArray(patch.minigameTicketsByEvent)
          ? (() => {
              const merged: Record<string, number> = { ...current.minigameTicketsByEvent };
              for (const [eventId, rawCount] of Object.entries(patch.minigameTicketsByEvent)) {
                if (typeof rawCount !== 'number' || !Number.isFinite(rawCount)) continue;
                const count = Math.max(0, Math.floor(rawCount));
                if (count > 0) {
                  merged[eventId] = count;
                } else {
                  delete merged[eventId];
                }
              }
              return merged;
            })()
          : current.minigameTicketsByEvent,
    };

    const gameStatePersistResult = await writeIslandRunGameStateRecord({
      session,
      client,
      record: nextState,
    });

    if (!gameStatePersistResult.ok) {
      return gameStatePersistResult;
    }

    if (typeof patch.onboardingComplete === 'boolean') {
      return persistIslandRunProfileMetadata({
        session,
        client,
        metadataPatch: {
          onboarding_complete: patch.onboardingComplete,
        },
      });
    }

    return { ok: true };
  },
};

export function getIslandRunRuntimeStateBackend(): IslandRunRuntimeStateBackend {
  return gameStateStorageBackend;
}
