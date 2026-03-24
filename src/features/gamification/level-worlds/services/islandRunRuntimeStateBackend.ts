import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { persistIslandRunProfileMetadata } from './islandRunProfile';
import type { IslandRunRuntimeState } from './islandRunRuntimeState';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import type { PerIslandEggsLedger } from './islandRunGameStateStore';
import {
  hydrateIslandRunGameStateRecord,
  hydrateIslandRunGameStateRecordWithSource,
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
} from './islandRunGameStateStore';

export interface IslandRunRuntimeStateBackend {
  read(session: Session): IslandRunRuntimeState;
  hydrate(options: { session: Session; client: SupabaseClient | null }): Promise<IslandRunRuntimeState>;
  hydrateWithSource(options: {
    session: Session;
    client: SupabaseClient | null;
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
      hearts?: number;
      coins?: number;
      spinTokens?: number;
      dicePool?: number;
      shardTierIndex?: number;
      shardClaimCount?: number;
      shields?: number;
      shards?: number;
      diamonds?: number;
      completedStopsByIsland?: Record<string, string[]>;
      marketOwnedBundlesByIsland?: Record<string, {
        dice_bundle: boolean;
        heart_bundle: boolean;
        heart_boost_bundle: boolean;
      }>;
    };
  }): Promise<{ ok: true } | { ok: false; errorMessage: string }>;
}

const gameStateStorageBackend: IslandRunRuntimeStateBackend = {
  read(session) {
    return readIslandRunGameStateRecord(session);
  },

  async hydrate({ session, client }) {
    return hydrateIslandRunGameStateRecord({ session, client });
  },

  async hydrateWithSource({ session, client }) {
    const result = await hydrateIslandRunGameStateRecordWithSource({ session, client });
    return { state: result.record, source: result.source };
  },

  async persistPatch({ session, client, patch }) {
    const current = await hydrateIslandRunGameStateRecord({ session, client });
    const nextState: IslandRunRuntimeState = {
      firstRunClaimed: typeof patch.firstRunClaimed === 'boolean' ? patch.firstRunClaimed : current.firstRunClaimed,
      dailyHeartsClaimedDayKey:
        typeof patch.dailyHeartsClaimedDayKey === 'string' || patch.dailyHeartsClaimedDayKey === null
          ? patch.dailyHeartsClaimedDayKey
          : current.dailyHeartsClaimedDayKey,
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
      hearts:
        typeof patch.hearts === 'number' && Number.isFinite(patch.hearts)
          ? Math.max(0, Math.floor(patch.hearts))
          : current.hearts,
      coins:
        typeof patch.coins === 'number' && Number.isFinite(patch.coins)
          ? Math.max(0, Math.floor(patch.coins))
          : current.coins,
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
