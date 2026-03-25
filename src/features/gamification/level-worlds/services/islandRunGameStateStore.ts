import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isDemoSession } from '../../../../services/demoSession';
import { getIslandRunDeviceSessionId } from './islandRunDeviceSession';
import { convertHeartToDicePool } from './islandRunEconomy';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import { logIslandRunEntryDebug } from './islandRunEntryDebug';

export type PerIslandEggStatus = 'incubating' | 'ready' | 'animal_ready' | 'collected' | 'sold' | 'animal_sold';

/** Where an egg lives: on a specific island, or dormant after hatching while the player is away. */
export type PerIslandEggLocation = 'island' | 'dormant';

export interface PerIslandEggEntry {
  tier: 'common' | 'rare' | 'mythic';
  setAtMs: number;
  hatchAtMs: number;
  status: PerIslandEggStatus;
  /** Location flag for dormant/carryover tracking. */
  location?: PerIslandEggLocation;
  /** Unix ms timestamp when the egg was collected or sold. */
  openedAt?: number;
  /** Unix ms timestamp when the hatched animal was collected from the egg. */
  animalCollectedAtMs?: number;
}

/** Key = island number (as string), value = egg entry */
export type PerIslandEggsLedger = Record<string, PerIslandEggEntry>;


export interface PerfectCompanionReason {
  strength: string[];
  weaknessSupport: string[];
  zoneMatch: boolean;
}

export interface CreatureCollectionRuntimeEntry {
  creatureId: string;
  copies: number;
  firstCollectedAtMs: number;
  lastCollectedAtMs: number;
  lastCollectedIslandNumber: number;
  bondXp: number;
  bondLevel: number;
  lastFedAtMs: number | null;
  claimedBondMilestones: number[];
}

export interface IslandRunGameStateRecord {
  runtimeVersion: number;
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
  onboardingDisplayNameLoopCompleted: boolean;
  storyPrologueSeen: boolean;
  audioEnabled: boolean;
  currentIslandNumber: number;
  cycleIndex: number;
  bossTrialResolvedIslandNumber: number | null;
  activeEggTier: 'common' | 'rare' | 'mythic' | null;
  activeEggSetAtMs: number | null;
  activeEggHatchDurationMs: number | null;
  activeEggIsDormant: boolean;
  perIslandEggs: PerIslandEggsLedger;
  islandStartedAtMs: number;
  islandExpiresAtMs: number;
  islandShards: number;
  tokenIndex: number;
  hearts: number;
  coins: number;
  spinTokens: number;
  dicePool: number;
  shardTierIndex: number;
  shardClaimCount: number;
  shields: number;
  shards: number;
  diamonds: number;
  creatureTreatInventory: {
    basic: number;
    favorite: number;
    rare: number;
  };
  companionBonusLastVisitKey: string | null;
  completedStopsByIsland: Record<string, string[]>;
  marketOwnedBundlesByIsland: Record<string, {
    dice_bundle: boolean;
    heart_bundle: boolean;
    heart_boost_bundle: boolean;
  }>;
  creatureCollection: CreatureCollectionRuntimeEntry[];
  activeCompanionId: string | null;
  perfectCompanionIds: string[];
  perfectCompanionReasons: Record<string, PerfectCompanionReason>;
  perfectCompanionComputedAtMs: number | null;
  perfectCompanionModelVersion: string | null;
  perfectCompanionComputedCycleIndex: number | null;
}

const ISLAND_RUN_RUNTIME_STATE_TABLE = 'island_run_runtime_state';
const ISLAND_RUN_REMOTE_BACKOFF_MS = 60 * 1000;

function getStorageKey(userId: string) {
  return `island_run_runtime_state_${userId}`;
}

function getRemoteBackoffStorageKey(userId: string) {
  return `${getStorageKey(userId)}_remote_backoff_until`;
}

function getPendingWriteStorageKey(userId: string) {
  return `${getStorageKey(userId)}_pending_write`;
}

function getNormalizedRuntimeStateError(error: { message?: string | null; code?: string | null } | null | undefined) {
  return {
    message: typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '',
    code: typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '',
  };
}

function isTransportLikeRuntimeStateError(error: { message?: string | null; code?: string | null } | null | undefined): boolean {
  if (!error) return false;

  const normalizedError = getNormalizedRuntimeStateError(error);
  const normalizedMessage = normalizedError.message;
  const normalizedCode = normalizedError.code;

  if (!normalizedMessage && !normalizedCode) return true;

  return [
    normalizedMessage === 'load failed',
    normalizedMessage === 'failed to fetch',
    normalizedMessage.includes('networkerror'),
    normalizedMessage.includes('network request failed'),
    normalizedMessage.includes('fetch failed'),
    normalizedMessage.includes('load failed'),
    normalizedCode === 'failed_to_fetch',
    normalizedCode === 'network_error',
  ].some(Boolean);
}

function isSchemaMismatchRuntimeStateError(error: { message?: string | null; code?: string | null } | null | undefined): boolean {
  if (!error) return false;

  const normalizedError = getNormalizedRuntimeStateError(error);
  const normalizedMessage = normalizedError.message;
  const normalizedCode = normalizedError.code;

  return [
    normalizedCode === '42703',
    normalizedCode === 'pgrst204',
    normalizedMessage.includes('does not exist'),
    normalizedMessage.includes('could not find the'),
    normalizedMessage.includes('schema cache'),
  ].some(Boolean);
}

function getRemoteBackoffUntil(userId: string): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getRemoteBackoffStorageKey(userId));
    if (!raw) return null;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      window.localStorage.removeItem(getRemoteBackoffStorageKey(userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setRemoteBackoffUntil(userId: string, backoffUntil: number | null) {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getRemoteBackoffStorageKey(userId);
    if (backoffUntil === null) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, String(backoffUntil));
  } catch {
    // ignore local persistence failures in prototype mode
  }
}

function activateRemoteBackoff(userId: string): number {
  const backoffUntil = Date.now() + ISLAND_RUN_REMOTE_BACKOFF_MS;
  setRemoteBackoffUntil(userId, backoffUntil);
  return backoffUntil;
}

function getRuntimeStateDebugFields(record: Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'bossTrialResolvedIslandNumber' | 'cycleIndex' | 'tokenIndex' | 'hearts' | 'coins' | 'spinTokens' | 'dicePool'>) {
  return {
    currentIslandNumber: record.currentIslandNumber,
    bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
    cycleIndex: record.cycleIndex,
    tokenIndex: record.tokenIndex,
    hearts: record.hearts,
    coins: record.coins,
    spinTokens: record.spinTokens,
    dicePool: record.dicePool,
  };
}

function getDefaultRecord(): IslandRunGameStateRecord {
  const nowMs = Date.now();
  return {
    runtimeVersion: 0,
    firstRunClaimed: false,
    dailyHeartsClaimedDayKey: null,
    onboardingDisplayNameLoopCompleted: false,
    storyPrologueSeen: false,
    audioEnabled: true,
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
    hearts: 5,
    coins: 0,
    spinTokens: 0,
    dicePool: convertHeartToDicePool(1),
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
    marketOwnedBundlesByIsland: {},
    creatureCollection: [],
    activeCompanionId: null,
    perfectCompanionIds: [],
    perfectCompanionReasons: {},
    perfectCompanionComputedAtMs: null,
    perfectCompanionModelVersion: null,
    perfectCompanionComputedCycleIndex: null,
  };
}

function toCreatureCollectionEntry(value: unknown): CreatureCollectionRuntimeEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.creatureId !== 'string' || !candidate.creatureId.trim()) return null;
  const copies = typeof candidate.copies === 'number' && Number.isFinite(candidate.copies) ? Math.max(1, Math.floor(candidate.copies)) : 1;
  const firstCollectedAtMs = typeof candidate.firstCollectedAtMs === 'number' && Number.isFinite(candidate.firstCollectedAtMs)
    ? candidate.firstCollectedAtMs
    : Date.now();
  const lastCollectedAtMs = typeof candidate.lastCollectedAtMs === 'number' && Number.isFinite(candidate.lastCollectedAtMs)
    ? candidate.lastCollectedAtMs
    : firstCollectedAtMs;
  const lastCollectedIslandNumber = typeof candidate.lastCollectedIslandNumber === 'number' && Number.isFinite(candidate.lastCollectedIslandNumber)
    ? Math.max(1, Math.floor(candidate.lastCollectedIslandNumber))
    : 1;
  const bondXp = typeof candidate.bondXp === 'number' && Number.isFinite(candidate.bondXp)
    ? Math.max(0, Math.floor(candidate.bondXp))
    : 0;
  const derivedBondLevel = Math.floor(bondXp / 3) + 1;
  const bondLevel = typeof candidate.bondLevel === 'number' && Number.isFinite(candidate.bondLevel)
    ? Math.max(1, Math.floor(candidate.bondLevel), derivedBondLevel)
    : derivedBondLevel;
  const lastFedAtMs = typeof candidate.lastFedAtMs === 'number' && Number.isFinite(candidate.lastFedAtMs)
    ? candidate.lastFedAtMs
    : null;
  const claimedBondMilestones = Array.isArray(candidate.claimedBondMilestones)
    ? Array.from(new Set(candidate.claimedBondMilestones
      .filter((milestone): milestone is number => typeof milestone === 'number' && Number.isFinite(milestone))
      .map((milestone) => Math.max(1, Math.floor(milestone))))
    ).sort((a, b) => a - b)
    : [];
  return {
    creatureId: candidate.creatureId,
    copies,
    firstCollectedAtMs,
    lastCollectedAtMs,
    lastCollectedIslandNumber,
    bondXp,
    bondLevel,
    lastFedAtMs,
    claimedBondMilestones,
  };
}

function toRecord(value: Partial<IslandRunGameStateRecord>, fallback: IslandRunGameStateRecord): IslandRunGameStateRecord {
  const eggTierRaw = value.activeEggTier;
  const activeEggTier: 'common' | 'rare' | 'mythic' | null =
    eggTierRaw === 'common' || eggTierRaw === 'rare' || eggTierRaw === 'mythic' ? eggTierRaw : fallback.activeEggTier;
  return {
    runtimeVersion:
      typeof value.runtimeVersion === 'number' && Number.isFinite(value.runtimeVersion)
        ? Math.max(0, Math.floor(value.runtimeVersion))
        : fallback.runtimeVersion,
    firstRunClaimed: typeof value.firstRunClaimed === 'boolean' ? value.firstRunClaimed : fallback.firstRunClaimed,
    dailyHeartsClaimedDayKey:
      typeof value.dailyHeartsClaimedDayKey === 'string' || value.dailyHeartsClaimedDayKey === null
        ? value.dailyHeartsClaimedDayKey
        : fallback.dailyHeartsClaimedDayKey,
    onboardingDisplayNameLoopCompleted:
      typeof value.onboardingDisplayNameLoopCompleted === 'boolean'
        ? value.onboardingDisplayNameLoopCompleted
        : fallback.onboardingDisplayNameLoopCompleted,
    storyPrologueSeen:
      typeof value.storyPrologueSeen === 'boolean'
        ? value.storyPrologueSeen
        : fallback.storyPrologueSeen,
    audioEnabled:
      typeof value.audioEnabled === 'boolean'
        ? value.audioEnabled
        : fallback.audioEnabled,
    currentIslandNumber:
      typeof value.currentIslandNumber === 'number' && Number.isFinite(value.currentIslandNumber)
        ? Math.max(1, Math.floor(value.currentIslandNumber))
        : fallback.currentIslandNumber,
    cycleIndex:
      typeof value.cycleIndex === 'number' && Number.isFinite(value.cycleIndex)
        ? Math.max(0, Math.floor(value.cycleIndex))
        : fallback.cycleIndex,
    bossTrialResolvedIslandNumber:
      typeof value.bossTrialResolvedIslandNumber === 'number' && Number.isFinite(value.bossTrialResolvedIslandNumber)
        ? Math.max(1, Math.floor(value.bossTrialResolvedIslandNumber))
        : value.bossTrialResolvedIslandNumber === null
          ? null
          : fallback.bossTrialResolvedIslandNumber,
    activeEggTier,
    activeEggSetAtMs:
      typeof value.activeEggSetAtMs === 'number' && Number.isFinite(value.activeEggSetAtMs)
        ? value.activeEggSetAtMs
        : value.activeEggSetAtMs === null
          ? null
          : fallback.activeEggSetAtMs,
    activeEggHatchDurationMs:
      typeof value.activeEggHatchDurationMs === 'number' && Number.isFinite(value.activeEggHatchDurationMs)
        ? value.activeEggHatchDurationMs
        : value.activeEggHatchDurationMs === null
          ? null
          : fallback.activeEggHatchDurationMs,
    activeEggIsDormant: typeof value.activeEggIsDormant === 'boolean' ? value.activeEggIsDormant : fallback.activeEggIsDormant,
    perIslandEggs: value.perIslandEggs !== null && typeof value.perIslandEggs === 'object' && !Array.isArray(value.perIslandEggs)
      ? (value.perIslandEggs as PerIslandEggsLedger)
      : fallback.perIslandEggs,
    islandStartedAtMs:
      typeof value.islandStartedAtMs === 'number' && Number.isFinite(value.islandStartedAtMs)
        ? value.islandStartedAtMs
        : fallback.islandStartedAtMs,
    islandExpiresAtMs:
      typeof value.islandExpiresAtMs === 'number' && Number.isFinite(value.islandExpiresAtMs)
        ? value.islandExpiresAtMs
        : fallback.islandExpiresAtMs,
    islandShards:
      typeof value.islandShards === 'number' && Number.isFinite(value.islandShards)
        ? Math.max(0, Math.floor(value.islandShards))
        : fallback.islandShards,
    tokenIndex:
      typeof value.tokenIndex === 'number' && Number.isFinite(value.tokenIndex)
        ? Math.max(0, Math.floor(value.tokenIndex))
        : fallback.tokenIndex,
    hearts:
      typeof value.hearts === 'number' && Number.isFinite(value.hearts)
        ? Math.max(0, Math.floor(value.hearts))
        : fallback.hearts,
    coins:
      typeof value.coins === 'number' && Number.isFinite(value.coins)
        ? Math.max(0, Math.floor(value.coins))
        : fallback.coins,
    spinTokens:
      typeof value.spinTokens === 'number' && Number.isFinite(value.spinTokens)
        ? Math.max(0, Math.floor(value.spinTokens))
        : fallback.spinTokens,
    dicePool:
      typeof value.dicePool === 'number' && Number.isFinite(value.dicePool)
        ? Math.max(0, Math.floor(value.dicePool))
        : fallback.dicePool,
    shardTierIndex:
      typeof value.shardTierIndex === 'number' && Number.isFinite(value.shardTierIndex)
        ? Math.max(0, Math.floor(value.shardTierIndex))
        : fallback.shardTierIndex,
    shardClaimCount:
      typeof value.shardClaimCount === 'number' && Number.isFinite(value.shardClaimCount)
        ? Math.max(0, Math.floor(value.shardClaimCount))
        : fallback.shardClaimCount,
    shields:
      typeof value.shields === 'number' && Number.isFinite(value.shields)
        ? Math.max(0, Math.floor(value.shields))
        : fallback.shields,
    shards:
      typeof value.shards === 'number' && Number.isFinite(value.shards)
        ? Math.max(0, Math.floor(value.shards))
        : fallback.shards,
    diamonds:
      typeof value.diamonds === 'number' && Number.isFinite(value.diamonds)
        ? Math.max(0, Math.floor(value.diamonds))
        : fallback.diamonds,
    creatureTreatInventory:
      value.creatureTreatInventory !== null && typeof value.creatureTreatInventory === 'object' && !Array.isArray(value.creatureTreatInventory)
        ? {
            basic: typeof value.creatureTreatInventory.basic === 'number' && Number.isFinite(value.creatureTreatInventory.basic)
              ? Math.max(0, Math.floor(value.creatureTreatInventory.basic))
              : fallback.creatureTreatInventory.basic,
            favorite: typeof value.creatureTreatInventory.favorite === 'number' && Number.isFinite(value.creatureTreatInventory.favorite)
              ? Math.max(0, Math.floor(value.creatureTreatInventory.favorite))
              : fallback.creatureTreatInventory.favorite,
            rare: typeof value.creatureTreatInventory.rare === 'number' && Number.isFinite(value.creatureTreatInventory.rare)
              ? Math.max(0, Math.floor(value.creatureTreatInventory.rare))
              : fallback.creatureTreatInventory.rare,
          }
        : fallback.creatureTreatInventory,
    companionBonusLastVisitKey:
      typeof value.companionBonusLastVisitKey === 'string' || value.companionBonusLastVisitKey === null
        ? value.companionBonusLastVisitKey
        : fallback.companionBonusLastVisitKey,
    completedStopsByIsland:
      value.completedStopsByIsland !== null && typeof value.completedStopsByIsland === 'object' && !Array.isArray(value.completedStopsByIsland)
        ? Object.fromEntries(
            Object.entries(value.completedStopsByIsland).map(([islandKey, stops]) => [
              islandKey,
              Array.isArray(stops) ? stops.filter((stop): stop is string => typeof stop === 'string') : [],
            ]),
          )
        : fallback.completedStopsByIsland,
    marketOwnedBundlesByIsland:
      value.marketOwnedBundlesByIsland !== null && typeof value.marketOwnedBundlesByIsland === 'object' && !Array.isArray(value.marketOwnedBundlesByIsland)
        ? Object.fromEntries(
            Object.entries(value.marketOwnedBundlesByIsland).map(([islandKey, bundles]) => [
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
          )
        : fallback.marketOwnedBundlesByIsland,
    creatureCollection:
      Array.isArray(value.creatureCollection)
        ? value.creatureCollection
            .map((entry) => toCreatureCollectionEntry(entry))
            .filter((entry): entry is CreatureCollectionRuntimeEntry => entry !== null)
        : fallback.creatureCollection,
    activeCompanionId:
      typeof value.activeCompanionId === 'string' || value.activeCompanionId === null
        ? value.activeCompanionId
        : fallback.activeCompanionId,
    perfectCompanionIds:
      Array.isArray(value.perfectCompanionIds)
        ? value.perfectCompanionIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : fallback.perfectCompanionIds,
    perfectCompanionReasons:
      value.perfectCompanionReasons !== null && typeof value.perfectCompanionReasons === 'object' && !Array.isArray(value.perfectCompanionReasons)
        ? Object.fromEntries(
            Object.entries(value.perfectCompanionReasons).map(([creatureId, reason]) => [
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
        : fallback.perfectCompanionReasons,
    perfectCompanionComputedAtMs:
      typeof value.perfectCompanionComputedAtMs === 'number' && Number.isFinite(value.perfectCompanionComputedAtMs)
        ? value.perfectCompanionComputedAtMs
        : value.perfectCompanionComputedAtMs === null
          ? null
          : fallback.perfectCompanionComputedAtMs,
    perfectCompanionModelVersion:
      typeof value.perfectCompanionModelVersion === 'string' || value.perfectCompanionModelVersion === null
        ? value.perfectCompanionModelVersion
        : fallback.perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex:
      typeof value.perfectCompanionComputedCycleIndex === 'number' && Number.isFinite(value.perfectCompanionComputedCycleIndex)
        ? Math.max(0, Math.floor(value.perfectCompanionComputedCycleIndex))
        : value.perfectCompanionComputedCycleIndex === null
          ? null
          : fallback.perfectCompanionComputedCycleIndex,
  };
}

function mergeStringArrayByUnion(left: string[] = [], right: string[] = []): string[] {
  return Array.from(new Set([...left, ...right]));
}

function mergeCreatureCollection(
  remote: CreatureCollectionRuntimeEntry[],
  local: CreatureCollectionRuntimeEntry[],
): CreatureCollectionRuntimeEntry[] {
  const byCreatureId = new Map<string, CreatureCollectionRuntimeEntry>();
  [...remote, ...local].forEach((entry) => {
    const existing = byCreatureId.get(entry.creatureId);
    if (!existing) {
      byCreatureId.set(entry.creatureId, entry);
      return;
    }

    const bondXp = Math.max(existing.bondXp, entry.bondXp);
    byCreatureId.set(entry.creatureId, {
      creatureId: existing.creatureId,
      copies: Math.max(existing.copies, entry.copies),
      firstCollectedAtMs: Math.min(existing.firstCollectedAtMs, entry.firstCollectedAtMs),
      lastCollectedAtMs: Math.max(existing.lastCollectedAtMs, entry.lastCollectedAtMs),
      lastCollectedIslandNumber: Math.max(existing.lastCollectedIslandNumber, entry.lastCollectedIslandNumber),
      bondXp,
      bondLevel: Math.max(existing.bondLevel, entry.bondLevel, Math.floor(bondXp / 3) + 1),
      lastFedAtMs: Math.max(existing.lastFedAtMs ?? 0, entry.lastFedAtMs ?? 0) || null,
      claimedBondMilestones: Array.from(new Set([
        ...existing.claimedBondMilestones,
        ...entry.claimedBondMilestones,
      ])).sort((a, b) => a - b),
    });
  });

  return Array.from(byCreatureId.values())
    .sort((a, b) => b.lastCollectedAtMs - a.lastCollectedAtMs);
}

function mergeRecordForConflict(options: {
  remote: IslandRunGameStateRecord;
  local: IslandRunGameStateRecord;
}): IslandRunGameStateRecord {
  const { remote, local } = options;
  const mergedCompletedStopsByIsland = {
    ...remote.completedStopsByIsland,
    ...local.completedStopsByIsland,
  };
  Object.keys(mergedCompletedStopsByIsland).forEach((islandKey) => {
    mergedCompletedStopsByIsland[islandKey] = mergeStringArrayByUnion(
      remote.completedStopsByIsland[islandKey] ?? [],
      local.completedStopsByIsland[islandKey] ?? [],
    );
  });

  const mergedMarketOwnedBundlesByIsland = {
    ...remote.marketOwnedBundlesByIsland,
    ...local.marketOwnedBundlesByIsland,
  };
  Object.keys(mergedMarketOwnedBundlesByIsland).forEach((islandKey) => {
    mergedMarketOwnedBundlesByIsland[islandKey] = {
      dice_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.dice_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.dice_bundle),
      heart_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_bundle),
      heart_boost_bundle:
        Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle),
    };
  });

  return {
    ...remote,
    ...local,
    runtimeVersion: remote.runtimeVersion,
    perIslandEggs: { ...remote.perIslandEggs, ...local.perIslandEggs },
    creatureTreatInventory: {
      basic: Math.max(remote.creatureTreatInventory.basic, local.creatureTreatInventory.basic),
      favorite: Math.max(remote.creatureTreatInventory.favorite, local.creatureTreatInventory.favorite),
      rare: Math.max(remote.creatureTreatInventory.rare, local.creatureTreatInventory.rare),
    },
    companionBonusLastVisitKey: local.companionBonusLastVisitKey ?? remote.companionBonusLastVisitKey,
    completedStopsByIsland: mergedCompletedStopsByIsland,
    marketOwnedBundlesByIsland: mergedMarketOwnedBundlesByIsland,
    creatureCollection: mergeCreatureCollection(remote.creatureCollection, local.creatureCollection),
    perfectCompanionIds: local.perfectCompanionIds.length > 0 ? local.perfectCompanionIds : remote.perfectCompanionIds,
    perfectCompanionReasons:
      Object.keys(local.perfectCompanionReasons).length > 0
        ? local.perfectCompanionReasons
        : remote.perfectCompanionReasons,
    perfectCompanionComputedAtMs: local.perfectCompanionComputedAtMs ?? remote.perfectCompanionComputedAtMs,
    perfectCompanionModelVersion: local.perfectCompanionModelVersion ?? remote.perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex:
      local.perfectCompanionComputedCycleIndex ?? remote.perfectCompanionComputedCycleIndex,
  };
}

function toRemoteRow(record: IslandRunGameStateRecord, runtimeVersion: number) {
  return {
    user_id: null as unknown as string,
    runtime_version: runtimeVersion,
    first_run_claimed: record.firstRunClaimed,
    daily_hearts_claimed_day_key: record.dailyHeartsClaimedDayKey,
    onboarding_display_name_loop_completed: record.onboardingDisplayNameLoopCompleted,
    story_prologue_seen: record.storyPrologueSeen,
    audio_enabled: record.audioEnabled,
    current_island_number: record.currentIslandNumber,
    cycle_index: record.cycleIndex,
    boss_trial_resolved_island_number: record.bossTrialResolvedIslandNumber,
    active_egg_tier: record.activeEggTier,
    active_egg_set_at_ms: record.activeEggSetAtMs,
    active_egg_hatch_duration_ms: record.activeEggHatchDurationMs,
    active_egg_is_dormant: record.activeEggIsDormant,
    per_island_eggs: record.perIslandEggs,
    island_started_at_ms: record.islandStartedAtMs,
    island_expires_at_ms: record.islandExpiresAtMs,
    island_shards: record.islandShards,
    token_index: record.tokenIndex,
    hearts: record.hearts,
    coins: record.coins,
    spin_tokens: record.spinTokens,
    dice_pool: record.dicePool,
    shard_tier_index: record.shardTierIndex,
    shard_claim_count: record.shardClaimCount,
    shields: record.shields,
    shards: record.shards,
    diamonds: record.diamonds,
    creature_treat_inventory: record.creatureTreatInventory,
    companion_bonus_last_visit_key: record.companionBonusLastVisitKey,
    completed_stops_by_island: record.completedStopsByIsland,
    market_owned_bundles_by_island: record.marketOwnedBundlesByIsland,
    creature_collection: record.creatureCollection,
    active_companion_id: record.activeCompanionId,
    perfect_companion_ids: record.perfectCompanionIds,
    perfect_companion_reasons: record.perfectCompanionReasons,
    perfect_companion_computed_at_ms: record.perfectCompanionComputedAtMs,
    perfect_companion_model_version: record.perfectCompanionModelVersion,
    perfect_companion_computed_cycle_index: record.perfectCompanionComputedCycleIndex,
    updated_at: new Date().toISOString(),
  };
}

export function readIslandRunGameStateRecord(session: Session): IslandRunGameStateRecord {
  const fallback = getDefaultRecord();

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(getStorageKey(session.user.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<IslandRunGameStateRecord>;
    return toRecord(parsed, fallback);
  } catch {
    return fallback;
  }
}

export type IslandRunGameStateHydrationSource = IslandRunRuntimeHydrationSource;

export async function hydrateIslandRunGameStateRecordWithSource(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<{ record: IslandRunGameStateRecord; source: IslandRunGameStateHydrationSource }> {
  const { session, client } = options;
  const fallback = readIslandRunGameStateRecord(session);

  if (isDemoSession(session) || !client) {
    logIslandRunEntryDebug('runtime_state_hydrate_skipped_remote', {
      userId: session.user.id,
      reason: isDemoSession(session) ? 'demo_session' : 'missing_client',
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_demo_or_no_client' };
  }

  const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
  if (remoteBackoffUntil !== null) {
    logIslandRunEntryDebug('runtime_state_hydrate_skipped_remote', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_query_error' };
  }

  logIslandRunEntryDebug('runtime_state_hydrate_query_start', {
    userId: session.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    ...getRuntimeStateDebugFields(fallback),
    fallbackCurrentIslandNumber: fallback.currentIslandNumber,
    fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
  });

  const { data, error } = await client
    .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
    .select('runtime_version,first_run_claimed,daily_hearts_claimed_day_key,onboarding_display_name_loop_completed,story_prologue_seen,audio_enabled,current_island_number,cycle_index,boss_trial_resolved_island_number,active_egg_tier,active_egg_set_at_ms,active_egg_hatch_duration_ms,active_egg_is_dormant,per_island_eggs,island_started_at_ms,island_expires_at_ms,island_shards,token_index,hearts,coins,spin_tokens,dice_pool,shard_tier_index,shard_claim_count,shields,shards,diamonds,creature_treat_inventory,companion_bonus_last_visit_key,completed_stops_by_island,market_owned_bundles_by_island,creature_collection,active_companion_id,perfect_companion_ids,perfect_companion_reasons,perfect_companion_computed_at_ms,perfect_companion_model_version,perfect_companion_computed_cycle_index')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    const remoteBackoffTriggered = isTransportLikeRuntimeStateError(error) || isSchemaMismatchRuntimeStateError(error);
    const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;

    logIslandRunEntryDebug('runtime_state_hydrate_query_error', {
      userId: session.user.id,
      message: error.message,
      code: error.code ?? null,
      remoteBackoffTriggered,
      remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_query_error' };
  }

  if (!data) {
    logIslandRunEntryDebug('runtime_state_hydrate_no_row', {
      userId: session.user.id,
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_no_row' };
  }

  const hydratedRecord = toRecord(
    {
      runtimeVersion: data.runtime_version ?? 0,
      firstRunClaimed: data.first_run_claimed,
      dailyHeartsClaimedDayKey: data.daily_hearts_claimed_day_key,
      onboardingDisplayNameLoopCompleted: data.onboarding_display_name_loop_completed ?? false,
      storyPrologueSeen: data.story_prologue_seen ?? false,
      audioEnabled: data.audio_enabled ?? true,
      currentIslandNumber: data.current_island_number,
      cycleIndex: data.cycle_index ?? 0,
      bossTrialResolvedIslandNumber: data.boss_trial_resolved_island_number,
      activeEggTier: data.active_egg_tier,
      activeEggSetAtMs: data.active_egg_set_at_ms,
      activeEggHatchDurationMs: data.active_egg_hatch_duration_ms,
      activeEggIsDormant: data.active_egg_is_dormant,
      perIslandEggs: data.per_island_eggs ?? {},
      islandStartedAtMs: data.island_started_at_ms,
      islandExpiresAtMs: data.island_expires_at_ms,
      islandShards: data.island_shards ?? 0,
      tokenIndex: data.token_index ?? 0,
      hearts: data.hearts ?? 5,
      coins: data.coins ?? 0,
      spinTokens: data.spin_tokens ?? 0,
      dicePool: data.dice_pool ?? fallback.dicePool,
      shardTierIndex: data.shard_tier_index ?? 0,
      shardClaimCount: data.shard_claim_count ?? 0,
      shields: data.shields ?? 0,
      shards: data.shards ?? 0,
      diamonds: data.diamonds ?? 3,
      creatureTreatInventory: data.creature_treat_inventory ?? fallback.creatureTreatInventory,
      companionBonusLastVisitKey: data.companion_bonus_last_visit_key ?? null,
      completedStopsByIsland: data.completed_stops_by_island ?? {},
      marketOwnedBundlesByIsland: data.market_owned_bundles_by_island ?? {},
      creatureCollection: data.creature_collection ?? [],
      activeCompanionId: data.active_companion_id ?? null,
      perfectCompanionIds: data.perfect_companion_ids ?? fallback.perfectCompanionIds,
      perfectCompanionReasons: data.perfect_companion_reasons ?? fallback.perfectCompanionReasons,
      perfectCompanionComputedAtMs: data.perfect_companion_computed_at_ms ?? fallback.perfectCompanionComputedAtMs,
      perfectCompanionModelVersion: data.perfect_companion_model_version ?? fallback.perfectCompanionModelVersion,
      perfectCompanionComputedCycleIndex: data.perfect_companion_computed_cycle_index ?? fallback.perfectCompanionComputedCycleIndex,
    },
    fallback,
  );

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(hydratedRecord));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  }

  setRemoteBackoffUntil(session.user.id, null);

  logIslandRunEntryDebug('runtime_state_hydrate_query_success', {
    userId: session.user.id,
    source: 'table',
    ...getRuntimeStateDebugFields(hydratedRecord),
  });

  return { record: hydratedRecord, source: 'table' };
}

export async function hydrateIslandRunGameStateRecord(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<IslandRunGameStateRecord> {
  const result = await hydrateIslandRunGameStateRecordWithSource(options);
  return result.record;
}

export async function writeIslandRunGameStateRecord(options: {
  session: Session;
  client: SupabaseClient | null;
  record: IslandRunGameStateRecord;
  skipQueueReplay?: boolean;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, record, skipQueueReplay = false } = options;
  const existingLocalRecord = readIslandRunGameStateRecord(session);
  const localRecord: IslandRunGameStateRecord = {
    ...record,
    runtimeVersion: Math.max(record.runtimeVersion, existingLocalRecord.runtimeVersion),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(localRecord));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  }

  const enqueuePendingWrite = (pendingRecord: IslandRunGameStateRecord) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getPendingWriteStorageKey(session.user.id), JSON.stringify(pendingRecord));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  };

  const readPendingWrite = (): IslandRunGameStateRecord | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(getPendingWriteStorageKey(session.user.id));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<IslandRunGameStateRecord>;
      return toRecord(parsed, getDefaultRecord());
    } catch {
      return null;
    }
  };

  const clearPendingWrite = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(getPendingWriteStorageKey(session.user.id));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  };

  if (isDemoSession(session) || !client) {
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug('runtime_state_persist_skipped_remote', {
      userId: session.user.id,
      reason: isDemoSession(session) ? 'demo_session' : 'missing_client',
      ...getRuntimeStateDebugFields(localRecord),
    });
    return { ok: true };
  }

  const deviceSessionId = getIslandRunDeviceSessionId(session.user.id);
  if (typeof (client as { rpc?: unknown }).rpc === 'function') {
    const { data: ownershipValidationData, error: ownershipValidationError } = await client.rpc(
      'island_run_validate_session_owner',
      {
        p_device_session_id: deviceSessionId,
      },
    );

    if (ownershipValidationError) {
      logIslandRunEntryDebug('runtime_state_persist_error', {
        userId: session.user.id,
        message: ownershipValidationError.message,
        code: ownershipValidationError.code ?? null,
        stage: 'ownership_validation_rpc_failed',
        deviceSessionId,
        ...getRuntimeStateDebugFields(localRecord),
      });
      return { ok: false, errorMessage: ownershipValidationError.message ?? 'Unable to validate Island Run session ownership.' };
    }

    const ownershipRow = Array.isArray(ownershipValidationData)
      ? ownershipValidationData[0]
      : ownershipValidationData;
    const isOwner = Boolean((ownershipRow as { is_owner?: unknown } | null)?.is_owner);
    const leaseIsActive = Boolean((ownershipRow as { lease_is_active?: unknown } | null)?.lease_is_active);

    if (!isOwner || !leaseIsActive) {
      logIslandRunEntryDebug('runtime_state_persist_error', {
        userId: session.user.id,
        message: 'Runtime write blocked: device is not active Island Run owner.',
        code: 'runtime_write_rejected_not_owner',
        stage: 'ownership_validation_failed',
        deviceSessionId,
        isOwner,
        leaseIsActive,
        ...getRuntimeStateDebugFields(localRecord),
      });
      return { ok: false, errorMessage: 'Island Run is active on another device. Take over this session to continue.' };
    }
  }

  const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
  if (remoteBackoffUntil !== null) {
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug('runtime_state_persist_skipped_remote', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      ...getRuntimeStateDebugFields(localRecord),
    });
    return { ok: true };
  }

  logIslandRunEntryDebug('runtime_state_persist_start', {
    userId: session.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    ...getRuntimeStateDebugFields(localRecord),
    runtimeVersion: localRecord.runtimeVersion,
  });

  if (!skipQueueReplay) {
    const pendingWrite = readPendingWrite();
    if (pendingWrite) {
      const replayResult = await writeIslandRunGameStateRecord({
        session,
        client,
        record: pendingWrite,
        skipQueueReplay: true,
      });
      if (replayResult.ok) {
        clearPendingWrite();
      } else {
        return replayResult;
      }
    }
  }

  const tryConditionalWrite = async (candidate: IslandRunGameStateRecord): Promise<
    | { status: 'ok'; nextVersion: number }
    | { status: 'missing_row' }
    | { status: 'conflict' }
    | { status: 'error'; error: { message?: string | null; code?: string | null } }
  > => {
    const expectedVersion = Math.max(0, Math.floor(candidate.runtimeVersion));
    const nextVersion = expectedVersion + 1;
    const payload = toRemoteRow(candidate, nextVersion);
    payload.user_id = session.user.id;

    const { data, error } = await client
      .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
      .update(payload)
      .eq('user_id', session.user.id)
      .eq('runtime_version', expectedVersion)
      .select('runtime_version')
      .maybeSingle();

    if (error) {
      return { status: 'error', error };
    }

    if (data) {
      return { status: 'ok', nextVersion };
    }

    const { data: rowExists, error: existsError } = await client
      .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existsError) {
      return { status: 'error', error: existsError };
    }

    return rowExists ? { status: 'conflict' } : { status: 'missing_row' };
  };

  let writeResult = await tryConditionalWrite(localRecord);

  if (writeResult.status === 'missing_row') {
    const payload = toRemoteRow(localRecord, 0);
    payload.user_id = session.user.id;
    const { error: insertError } = await client
      .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
      .insert(payload);

    if (!insertError) {
      writeResult = { status: 'ok', nextVersion: 0 };
    } else if (insertError.code === '23505') {
      writeResult = { status: 'conflict' };
    } else {
      writeResult = { status: 'error', error: insertError };
    }
  }

  if (writeResult.status === 'conflict') {
    const latest = await hydrateIslandRunGameStateRecordWithSource({ session, client });
    if (latest.source === 'table') {
      const merged = mergeRecordForConflict({
        remote: latest.record,
        local: localRecord,
      });
      writeResult = await tryConditionalWrite(merged);
    } else {
      writeResult = {
        status: 'error',
        error: {
          message: 'Runtime state conflict detected and latest server row could not be loaded.',
          code: 'runtime_conflict_remote_unavailable',
        },
      };
    }
  }

  if (writeResult.status === 'error') {
    const { error } = writeResult;
    const remoteBackoffTriggered = isTransportLikeRuntimeStateError(error) || isSchemaMismatchRuntimeStateError(error);
    const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;

    logIslandRunEntryDebug('runtime_state_persist_error', {
      userId: session.user.id,
      message: error.message,
      code: error.code ?? null,
      remoteBackoffTriggered,
      remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
      ...getRuntimeStateDebugFields(localRecord),
    });

    if (remoteBackoffTriggered) {
      enqueuePendingWrite(localRecord);
      return { ok: true };
    }

    return { ok: false, errorMessage: error.message ?? 'Unknown runtime state persistence error.' };
  }

  if (writeResult.status !== 'ok') {
    return { ok: false, errorMessage: 'Runtime state persistence did not reach a terminal success state.' };
  }

  setRemoteBackoffUntil(session.user.id, null);
  clearPendingWrite();

  if (typeof window !== 'undefined') {
    try {
      const persisted = {
        ...localRecord,
        runtimeVersion: writeResult.nextVersion,
      };
      window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(persisted));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  }

  logIslandRunEntryDebug('runtime_state_persist_success', {
    userId: session.user.id,
    ...getRuntimeStateDebugFields(localRecord),
    runtimeVersion: writeResult.nextVersion,
  });

  return { ok: true };
}
