import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  CREATURE_CATALOG,
  type CreatureDefinition,
} from './creatureCatalog';
import {
  readIslandRunGameStateRecord,
  type CreatureCollectionRuntimeEntry,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { addCreatureToRuntimeCollection } from './islandRunCreatureCollectionLedger';
import { commitIslandRunState } from './islandRunStateStore';

export const FIRST_SESSION_CREATURE_PACK_CARD_COUNT = 5;
export const FIRST_SESSION_CREATURE_PACK_DICE_REWARD = 100;
export const FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION = 'first_session_creature_pack_v1';

type FirstSessionCreaturePackTier = CreatureDefinition['tier'];

export interface FirstSessionCreaturePackCardReveal {
  slotIndex: number;
  creatureId: string;
  name: string;
  tier: FirstSessionCreaturePackTier;
  imageKey: string;
  habitat: string;
  affinity: string;
  copiesBefore: number;
  copiesAfter: number;
}

export interface FirstSessionCreaturePackRevealPayload {
  source: 'first_session_onboarding_creature_pack';
  resolverVersion: typeof FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION;
  cardCount: typeof FIRST_SESSION_CREATURE_PACK_CARD_COUNT;
  diceGranted: typeof FIRST_SESSION_CREATURE_PACK_DICE_REWARD;
  cards: FirstSessionCreaturePackCardReveal[];
}

export interface ClaimFirstSessionCreaturePackRewardOptions {
  session: Session;
  client: SupabaseClient | null;
  nowMs?: number;
  triggerSource?: string;
}

export interface ClaimFirstSessionCreaturePackRewardResult {
  status: 'claimed' | 'already_claimed' | 'not_eligible';
  record: IslandRunGameStateRecord;
  revealPayload: FirstSessionCreaturePackRevealPayload | null;
  failureReason?: 'invalid_tutorial_state' | 'outside_first_island_onboarding';
}

interface WeightedTier {
  tier: FirstSessionCreaturePackTier;
  weight: number;
}

const FIRST_SESSION_CREATURE_PACK_SLOT_WEIGHTS: WeightedTier[][] = [
  [{ tier: 'common', weight: 1 }],
  [{ tier: 'common', weight: 85 }, { tier: 'rare', weight: 15 }],
  [{ tier: 'common', weight: 75 }, { tier: 'rare', weight: 25 }],
  [{ tier: 'common', weight: 70 }, { tier: 'rare', weight: 30 }],
  [{ tier: 'common', weight: 65 }, { tier: 'rare', weight: 35 }],
];

function normalizeNowMs(nowMs: number | undefined): number {
  return typeof nowMs === 'number' && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor(nowMs))
    : Date.now();
}

function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chooseTierForSlot(slotIndex: number, seed: string): FirstSessionCreaturePackTier {
  const weights = FIRST_SESSION_CREATURE_PACK_SLOT_WEIGHTS[slotIndex] ?? FIRST_SESSION_CREATURE_PACK_SLOT_WEIGHTS[0];
  const totalWeight = weights.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = hashStringToUint32(`${seed}:tier:${slotIndex}`) % Math.max(1, totalWeight);
  for (const entry of weights) {
    roll -= Math.max(0, entry.weight);
    if (roll < 0) return entry.tier;
  }
  return weights[0]?.tier ?? 'common';
}

function getCreaturesForTier(tier: FirstSessionCreaturePackTier): CreatureDefinition[] {
  return CREATURE_CATALOG.filter((creature) => creature.tier === tier);
}

function chooseCreatureForSlot(options: {
  slotIndex: number;
  tier: FirstSessionCreaturePackTier;
  seed: string;
  usedCreatureIds: Set<string>;
}): CreatureDefinition {
  const { slotIndex, tier, seed, usedCreatureIds } = options;
  const tierPool = getCreaturesForTier(tier);
  const uniquePool = tierPool.filter((creature) => !usedCreatureIds.has(creature.id));
  const pool = uniquePool.length > 0 ? uniquePool : tierPool;
  const index = hashStringToUint32(`${seed}:creature:${slotIndex}:${tier}`) % Math.max(1, pool.length);
  return pool[index] ?? CREATURE_CATALOG[0];
}

function getCopies(collection: CreatureCollectionRuntimeEntry[], creatureId: string): number {
  return collection.find((entry) => entry.creatureId === creatureId)?.copies ?? 0;
}

function buildFirstSessionCreaturePackCards(options: {
  current: IslandRunGameStateRecord;
  openedAtMs: number;
  userId: string;
}): FirstSessionCreaturePackCardReveal[] {
  const { current, openedAtMs, userId } = options;
  const seed = [
    userId,
    'first_session_creature_pack',
    current.currentIslandNumber,
    current.cycleIndex,
    current.runtimeVersion,
    openedAtMs,
  ].join(':');
  const usedCreatureIds = new Set<string>();
  let workingCollection = [...current.creatureCollection];

  return Array.from({ length: FIRST_SESSION_CREATURE_PACK_CARD_COUNT }, (_, slotIndex) => {
    const tier = chooseTierForSlot(slotIndex, seed);
    const creature = chooseCreatureForSlot({ slotIndex, tier, seed, usedCreatureIds });
    usedCreatureIds.add(creature.id);
    const copiesBefore = getCopies(workingCollection, creature.id);
    const nextCollection = addCreatureToRuntimeCollection({
      collection: workingCollection,
      creatureId: creature.id,
      islandNumber: current.currentIslandNumber,
      collectedAtMs: openedAtMs,
    });
    workingCollection = nextCollection;
    return {
      slotIndex,
      creatureId: creature.id,
      name: creature.name,
      tier: creature.tier,
      imageKey: creature.imageKey,
      habitat: creature.habitat,
      affinity: creature.affinity,
      copiesBefore,
      copiesAfter: copiesBefore + 1,
    };
  });
}

function applyPackCardsToCollection(options: {
  collection: CreatureCollectionRuntimeEntry[];
  cards: FirstSessionCreaturePackCardReveal[];
  islandNumber: number;
  collectedAtMs: number;
}): CreatureCollectionRuntimeEntry[] {
  const { cards, islandNumber, collectedAtMs } = options;
  return cards.reduce((collection, card) => addCreatureToRuntimeCollection({
    collection,
    creatureId: card.creatureId,
    islandNumber,
    collectedAtMs,
  }), options.collection);
}

function isOutsideFirstIslandOnboarding(record: IslandRunGameStateRecord): boolean {
  return record.currentIslandNumber !== 1 || record.cycleIndex !== 0;
}

export function claimFirstSessionCreaturePackReward(
  options: ClaimFirstSessionCreaturePackRewardOptions,
): Promise<ClaimFirstSessionCreaturePackRewardResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, triggerSource } = options;
    const current = readIslandRunGameStateRecord(session);

    if (
      current.firstSessionTutorialState === 'first_creature_pack_opened'
      || current.firstSessionTutorialState === 'first_creature_pack_claimed'
    ) {
      return {
        status: 'already_claimed',
        record: current,
        revealPayload: null,
      };
    }

    if (current.firstSessionTutorialState !== 'first_creature_pack_available') {
      return {
        status: 'not_eligible',
        record: current,
        revealPayload: null,
        failureReason: 'invalid_tutorial_state',
      };
    }

    if (isOutsideFirstIslandOnboarding(current)) {
      return {
        status: 'not_eligible',
        record: current,
        revealPayload: null,
        failureReason: 'outside_first_island_onboarding',
      };
    }

    const openedAtMs = normalizeNowMs(options.nowMs);
    const cards = buildFirstSessionCreaturePackCards({
      current,
      openedAtMs,
      userId: session.user.id,
    });
    const nextCreatureCollection = applyPackCardsToCollection({
      collection: current.creatureCollection,
      cards,
      islandNumber: current.currentIslandNumber,
      collectedAtMs: openedAtMs,
    });
    const next: IslandRunGameStateRecord = {
      ...current,
      dicePool: Math.max(0, current.dicePool + FIRST_SESSION_CREATURE_PACK_DICE_REWARD),
      creatureCollection: nextCreatureCollection,
      firstSessionTutorialState: 'first_creature_pack_claimed',
      runtimeVersion: current.runtimeVersion + 1,
    };

    await commitIslandRunState({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'claim_first_session_creature_pack_reward',
    });

    return {
      status: 'claimed',
      record: next,
      revealPayload: {
        source: 'first_session_onboarding_creature_pack',
        resolverVersion: FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION,
        cardCount: FIRST_SESSION_CREATURE_PACK_CARD_COUNT,
        diceGranted: FIRST_SESSION_CREATURE_PACK_DICE_REWARD,
        cards,
      },
    };
  });
}
