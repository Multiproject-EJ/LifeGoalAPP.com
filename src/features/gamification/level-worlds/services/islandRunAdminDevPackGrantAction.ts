import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getCreatureById } from './creatureCatalog';
import {
  buildCreaturePackCards,
  CREATURE_PACK_MIN_NEW_CREATURE_CARDS,
  STANDARD_CREATURE_PACK_SLOT_WEIGHTS,
  type CreaturePackCardReveal,
} from './islandRunCreaturePackResolver';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { addCreatureToRuntimeCollection } from './islandRunCreatureCollectionLedger';
import { logIslandRunEntryDebug } from './islandRunEntryDebug';
import {
  EGG_REWARD_RARITY_ROLL_DENOMINATOR,
  EGG_REWARD_RARITY_THRESHOLD,
  type EggRewardInventoryEntry,
  type EggRewardInventoryTier,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { ISLAND_RUN_ECONOMY_SOURCES, recordIslandRunDiceInflow } from './islandRunEconomyTelemetry';

export const ADMIN_DEV_PACK_GRANT_RESOLVER_VERSION = 'admin_dev_pack_grant_v1' as const;

export interface AdminDevFixedEggRewardGrant {
  eggTier: EggRewardInventoryTier;
  targetIslandNumber?: number;
}

export interface GrantAdminDevCreaturePackOptions {
  session: Session;
  client: SupabaseClient | null;
  grantId: string;
  grantSource: 'dev' | 'admin';
  allowGrant: boolean;
  creatureIds?: string[];
  creaturePackSeedScope?: string;
  eggRewards?: AdminDevFixedEggRewardGrant[];
  diceBonus?: number;
  essenceBonus?: number;
  nowMs?: number;
  triggerSource?: string;
}

export interface GrantAdminDevCreaturePackResult {
  status: 'granted' | 'already_granted' | 'unauthorized' | 'invalid_request';
  record: IslandRunGameStateRecord;
  grantId: string;
  creatureCopiesGranted: number;
  eggRewardsGranted: number;
  diceGranted: number;
  essenceGranted: number;
  failureReason?: string;
  creatureCards?: CreaturePackCardReveal[];
}

const MAX_CREATURES_PER_DEV_GRANT = 12;
const MAX_EGGS_PER_DEV_GRANT = 12;
const MAX_BONUS_PER_DEV_GRANT = 10_000;
const GRANT_ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{2,96}$/;

function normalizeGrantId(grantId: string): string {
  return grantId.trim().toLowerCase();
}

function normalizeNowMs(nowMs: number | undefined): number {
  return typeof nowMs === 'number' && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor(nowMs))
    : Date.now();
}

function normalizeBonus(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_BONUS_PER_DEV_GRANT, Math.floor(value)));
}

/**
 * Deterministic FNV-1a seed helper for admin/dev egg reward vouchers.
 * The seed is derived from fixed grant metadata so repeated grants with the
 * same id would resolve to the same egg voucher data without using randomness.
 */
function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hasGrantMarker(record: IslandRunGameStateRecord, grantId: string): boolean {
  const creatureMarker = record.creatureCollection.some((entry) => entry.grantIds?.includes(grantId));
  if (creatureMarker) return true;
  const eggPrefix = `admin_dev_pack:${grantId}:egg:`;
  return record.eggRewardInventory.some((entry) => entry.eggRewardId.startsWith(eggPrefix));
}

function buildEggRewardEntry(options: {
  grantId: string;
  slotIndex: number;
  eggTier: EggRewardInventoryTier;
  targetIslandNumber: number;
  cycleIndex: number;
  grantedAtMs: number;
}): EggRewardInventoryEntry {
  const { grantId, slotIndex, eggTier, targetIslandNumber, cycleIndex, grantedAtMs } = options;
  const eggRewardId = `admin_dev_pack:${grantId}:egg:${slotIndex + 1}`;
  const seed = hashStringToUint32(`${ADMIN_DEV_PACK_GRANT_RESOLVER_VERSION}:${eggRewardId}:${eggTier}:${targetIslandNumber}`);

  return {
    eggRewardId,
    source: 'treasure_path',
    sourceSessionKey: `admin_dev_pack:${grantId}`,
    sourceRunId: grantId,
    sourceRewardId: `egg:${slotIndex + 1}`,
    tileId: 0,
    cycleIndex,
    targetIslandNumber,
    eggTier,
    eggSeed: seed,
    rarityRoll: seed % EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityRollDenominator: EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityThreshold: EGG_REWARD_RARITY_THRESHOLD,
    resolverVersion: 'treasure_path_egg_v1',
    status: 'unopened',
    grantedAtMs,
    openedAtMs: null,
  };
}

function validateRequest(options: {
  grantId: string;
  creatureIds: string[];
  eggRewards: AdminDevFixedEggRewardGrant[];
  diceBonus: number;
  essenceBonus: number;
}): string | null {
  const { grantId, creatureIds, eggRewards, diceBonus, essenceBonus } = options;
  if (!GRANT_ID_PATTERN.test(grantId)) {
    return 'grant_id_must_be_3_to_97_chars_and_use_letters_numbers_colon_dash_or_underscore';
  }
  if (creatureIds.length < 1 && eggRewards.length < 1) {
    return 'grant_must_include_creatures_or_egg_rewards';
  }
  if (creatureIds.length > MAX_CREATURES_PER_DEV_GRANT) {
    return `too_many_creatures_max_${MAX_CREATURES_PER_DEV_GRANT}`;
  }
  if (eggRewards.length > MAX_EGGS_PER_DEV_GRANT) {
    return `too_many_eggs_max_${MAX_EGGS_PER_DEV_GRANT}`;
  }
  for (const creatureId of creatureIds) {
    if (!getCreatureById(creatureId)) return `unknown_creature_id:${creatureId}`;
  }
  for (const eggReward of eggRewards) {
    if (eggReward.eggTier !== 'common' && eggReward.eggTier !== 'rare') {
      return `unsupported_egg_tier:${String(eggReward.eggTier)}`;
    }
  }
  if (diceBonus < 0 || essenceBonus < 0) return 'bonus_values_must_be_non_negative';
  return null;
}

export function grantAdminDevCreaturePack(
  options: GrantAdminDevCreaturePackOptions,
): Promise<GrantAdminDevCreaturePackResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, grantSource, allowGrant, triggerSource } = options;
    const current = getIslandRunStateSnapshot(session);
    const grantId = normalizeGrantId(options.grantId);
    const grantOpenedAtMs = normalizeNowMs(options.nowMs);
    const requestedCreatureIds = (options.creatureIds ?? []).map((creatureId) => creatureId.trim()).filter(Boolean);
    const shouldResolveCreaturePack = requestedCreatureIds.length === 0 && typeof options.creaturePackSeedScope === 'string' && options.creaturePackSeedScope.trim().length > 0;
    const resolvedCreatureCards = shouldResolveCreaturePack
      ? buildCreaturePackCards({
          current,
          openedAtMs: grantOpenedAtMs,
          userId: session.user.id,
          seedScope: options.creaturePackSeedScope?.trim() || 'admin_dev_creature_pack',
          slotWeights: STANDARD_CREATURE_PACK_SLOT_WEIGHTS,
          minNewCreatureCards: CREATURE_PACK_MIN_NEW_CREATURE_CARDS,
        })
      : [];
    const creatureIds = shouldResolveCreaturePack
      ? resolvedCreatureCards.map((card) => card.creatureId)
      : requestedCreatureIds;
    const eggRewards = options.eggRewards ?? [];
    const diceBonus = normalizeBonus(options.diceBonus);
    const essenceBonus = normalizeBonus(options.essenceBonus);

    if (!allowGrant || (grantSource !== 'dev' && grantSource !== 'admin')) {
      return {
        status: 'unauthorized',
        record: current,
        grantId,
        creatureCopiesGranted: 0,
        eggRewardsGranted: 0,
        diceGranted: 0,
        essenceGranted: 0,
        creatureCards: [],
        failureReason: 'grant_requires_dev_or_admin_gate',
      };
    }

    const validationFailure = validateRequest({ grantId, creatureIds, eggRewards, diceBonus, essenceBonus });
    if (validationFailure) {
      return {
        status: 'invalid_request',
        record: current,
        grantId,
        creatureCopiesGranted: 0,
        eggRewardsGranted: 0,
        diceGranted: 0,
        essenceGranted: 0,
        creatureCards: [],
        failureReason: validationFailure,
      };
    }

    if (hasGrantMarker(current, grantId)) {
      return {
        status: 'already_granted',
        record: current,
        grantId,
        creatureCopiesGranted: 0,
        eggRewardsGranted: 0,
        diceGranted: 0,
        essenceGranted: 0,
        creatureCards: [],
      };
    }

    const nowMs = grantOpenedAtMs;
    let nextCreatureCollection = current.creatureCollection;
    for (const creatureId of creatureIds) {
      nextCreatureCollection = addCreatureToRuntimeCollection({
        collection: nextCreatureCollection,
        creatureId,
        islandNumber: current.currentIslandNumber,
        collectedAtMs: nowMs,
        grantId,
      });
    }

    const nextEggRewardEntries = eggRewards.map((eggReward, slotIndex) => buildEggRewardEntry({
      grantId,
      slotIndex,
      eggTier: eggReward.eggTier,
      targetIslandNumber: Number.isFinite(eggReward.targetIslandNumber)
        ? Math.max(1, Math.floor(eggReward.targetIslandNumber as number))
        : current.currentIslandNumber,
      cycleIndex: current.cycleIndex,
      grantedAtMs: nowMs,
    }));

    const next: IslandRunGameStateRecord = {
      ...current,
      creatureCollection: nextCreatureCollection,
      eggRewardInventory: [
        ...current.eggRewardInventory,
        ...nextEggRewardEntries,
      ],
      dicePool: Math.max(0, current.dicePool + diceBonus),
      essence: Math.max(0, current.essence + essenceBonus),
      essenceLifetimeEarned: Math.max(0, current.essenceLifetimeEarned + essenceBonus),
      runtimeVersion: current.runtimeVersion + 1,
    };

    recordIslandRunDiceInflow({
      source: ISLAND_RUN_ECONOMY_SOURCES.devAdminGrantDice,
      amount: diceBonus,
      sessionId: session.user.id,
      atMs: nowMs,
      metadata: { grantId, grantSource, triggerSource: triggerSource ?? 'admin_dev_pack_grant' },
    });
    await commitIslandRunState({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'admin_dev_pack_grant',
    });

    logIslandRunEntryDebug('admin_dev_pack_grant', {
      userId: session.user.id,
      grantId,
      grantSource,
      creatureIds,
      creatureNames: creatureIds.map((creatureId) => getCreatureById(creatureId)?.name ?? creatureId),
      eggRewards: nextEggRewardEntries.map((entry) => ({
        eggRewardId: entry.eggRewardId,
        eggTier: entry.eggTier,
        targetIslandNumber: entry.targetIslandNumber,
      })),
      diceBonus,
      essenceBonus,
      resolverVersion: ADMIN_DEV_PACK_GRANT_RESOLVER_VERSION,
    });

    return {
      status: 'granted',
      record: next,
      grantId,
      creatureCopiesGranted: creatureIds.length,
      eggRewardsGranted: nextEggRewardEntries.length,
      diceGranted: diceBonus,
      essenceGranted: essenceBonus,
      creatureCards: resolvedCreatureCards,
    };
  });
}

export function grantDevDemoCreaturePack(options: {
  session: Session;
  client: SupabaseClient | null;
  allowGrant: boolean;
  triggerSource?: string;
  nowMs?: number;
}): Promise<GrantAdminDevCreaturePackResult> {
  const current = getIslandRunStateSnapshot(options.session);
  return grantAdminDevCreaturePack({
    session: options.session,
    client: options.client,
    grantId: `dev_demo_creature_pack_v1:${current.currentIslandNumber}:${current.cycleIndex}`,
    grantSource: 'dev',
    allowGrant: options.allowGrant,
    creaturePackSeedScope: 'dev_demo_creature_pack',
    nowMs: options.nowMs,
    triggerSource: options.triggerSource ?? 'dev_demo_creature_pack_grant',
  });
}

export function grantDevDemoCreaturePackOpeningPrototype(options: {
  session: Session;
  client: SupabaseClient | null;
  allowGrant: boolean;
  triggerSource?: string;
  nowMs?: number;
}): Promise<GrantAdminDevCreaturePackResult> {
  const current = getIslandRunStateSnapshot(options.session);
  return grantAdminDevCreaturePack({
    session: options.session,
    client: options.client,
    grantId: `dev_demo_creature_pack_opening_v1:${current.currentIslandNumber}:${current.cycleIndex}`,
    grantSource: 'dev',
    allowGrant: options.allowGrant,
    creaturePackSeedScope: 'dev_demo_creature_pack_opening',
    nowMs: options.nowMs,
    triggerSource: options.triggerSource ?? 'dev_demo_creature_pack_opening_prototype',
  });
}

export function grantDevDemoEggRewardPack(options: {
  session: Session;
  client: SupabaseClient | null;
  allowGrant: boolean;
  triggerSource?: string;
}): Promise<GrantAdminDevCreaturePackResult> {
  const current = getIslandRunStateSnapshot(options.session);
  return grantAdminDevCreaturePack({
    session: options.session,
    client: options.client,
    grantId: `dev_demo_egg_reward_pack_v1:${current.currentIslandNumber}:${current.cycleIndex}`,
    grantSource: 'dev',
    allowGrant: options.allowGrant,
    eggRewards: DEV_DEMO_EGG_REWARD_PACK_TIERS.map((eggTier) => ({ eggTier })),
    essenceBonus: 10,
    triggerSource: options.triggerSource ?? 'dev_demo_egg_reward_pack_grant',
  });
}

export const DEV_DEMO_CREATURE_PACK_CARD_COUNT = 5;

export const DEV_DEMO_EGG_REWARD_PACK_TIERS = [
  'common',
  'rare',
] as const satisfies readonly EggRewardInventoryTier[];
