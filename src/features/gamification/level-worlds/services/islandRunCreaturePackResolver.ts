import {
  CREATURE_CATALOG,
  type CreatureDefinition,
} from './creatureCatalog';
import type {
  CreatureCollectionRuntimeEntry,
  IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { addCreatureToRuntimeCollection } from './islandRunCreatureCollectionLedger';

export type CreaturePackTier = CreatureDefinition['tier'];

export interface CreaturePackCardReveal {
  slotIndex: number;
  creatureId: string;
  name: string;
  tier: CreaturePackTier;
  imageKey: string;
  habitat: string;
  affinity: string;
  copiesBefore: number;
  copiesAfter: number;
}

export interface CreaturePackWeightedTier {
  tier: CreaturePackTier;
  weight: number;
}

export const CREATURE_PACK_CARD_COUNT = 5;
export const CREATURE_PACK_MIN_NEW_CREATURE_CARDS = 2;

export const STANDARD_CREATURE_PACK_SLOT_WEIGHTS: CreaturePackWeightedTier[][] = [
  [{ tier: 'common', weight: 1 }],
  [{ tier: 'common', weight: 95 }, { tier: 'rare', weight: 5 }],
  [{ tier: 'common', weight: 90 }, { tier: 'rare', weight: 10 }],
  [{ tier: 'common', weight: 85 }, { tier: 'rare', weight: 15 }],
  [{ tier: 'common', weight: 80 }, { tier: 'rare', weight: 20 }],
];

function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chooseTierForSlot(slotIndex: number, seed: string, slotWeights: CreaturePackWeightedTier[][]): CreaturePackTier {
  const weights = slotWeights[slotIndex] ?? slotWeights[0] ?? [{ tier: 'common', weight: 1 }];
  const totalWeight = weights.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = hashStringToUint32(`${seed}:tier:${slotIndex}`) % Math.max(1, totalWeight);
  for (const entry of weights) {
    roll -= Math.max(0, entry.weight);
    if (roll < 0) return entry.tier;
  }
  return weights[0]?.tier ?? 'common';
}

function getCreaturesForTier(tier: CreaturePackTier): CreatureDefinition[] {
  return CREATURE_CATALOG.filter((creature) => creature.tier === tier);
}

function chooseCreatureForSlot(options: {
  slotIndex: number;
  tier: CreaturePackTier;
  seed: string;
  usedCreatureIds: Set<string>;
  originallyOwnedCreatureIds: Set<string>;
  preferUnowned: boolean;
  requireUnownedFallback: boolean;
}): CreatureDefinition {
  const { slotIndex, tier, seed, usedCreatureIds, originallyOwnedCreatureIds, preferUnowned, requireUnownedFallback } = options;
  const tierPool = getCreaturesForTier(tier);
  const uniqueTierPool = tierPool.filter((creature) => !usedCreatureIds.has(creature.id));
  const unownedUniqueTierPool = uniqueTierPool.filter((creature) => !originallyOwnedCreatureIds.has(creature.id));

  let pool = preferUnowned && unownedUniqueTierPool.length > 0
    ? unownedUniqueTierPool
    : uniqueTierPool.length > 0 ? uniqueTierPool : tierPool;

  if (requireUnownedFallback && (pool.length < 1 || pool.every((creature) => originallyOwnedCreatureIds.has(creature.id)))) {
    const anyUnownedUniquePool = CREATURE_CATALOG.filter((creature) => (
      !usedCreatureIds.has(creature.id)
      && !originallyOwnedCreatureIds.has(creature.id)
    ));
    if (anyUnownedUniquePool.length > 0) {
      pool = anyUnownedUniquePool;
    }
  }

  const index = hashStringToUint32(`${seed}:creature:${slotIndex}:${tier}:${preferUnowned ? 'new' : 'any'}`) % Math.max(1, pool.length);
  return pool[index] ?? CREATURE_CATALOG[0];
}

function getCopies(collection: CreatureCollectionRuntimeEntry[], creatureId: string): number {
  return collection.find((entry) => entry.creatureId === creatureId)?.copies ?? 0;
}

export function buildCreaturePackCards(options: {
  current: IslandRunGameStateRecord;
  openedAtMs: number;
  userId: string;
  seedScope: string;
  slotWeights: CreaturePackWeightedTier[][];
  minNewCreatureCards?: number;
}): CreaturePackCardReveal[] {
  const {
    current,
    openedAtMs,
    userId,
    seedScope,
    slotWeights,
  } = options;
  const minNewCreatureCards = typeof options.minNewCreatureCards === 'number' && Number.isFinite(options.minNewCreatureCards)
    ? Math.max(0, Math.min(CREATURE_PACK_CARD_COUNT, Math.floor(options.minNewCreatureCards)))
    : 0;
  const seed = [
    userId,
    seedScope,
    current.currentIslandNumber,
    current.cycleIndex,
    current.runtimeVersion,
    openedAtMs,
  ].join(':');
  const usedCreatureIds = new Set<string>();
  const originallyOwnedCreatureIds = new Set(current.creatureCollection.filter((entry) => entry.copies > 0).map((entry) => entry.creatureId));
  const availableUnownedCount = CREATURE_CATALOG.filter((creature) => !originallyOwnedCreatureIds.has(creature.id)).length;
  const guaranteedNewTarget = Math.min(minNewCreatureCards, availableUnownedCount);
  let newCreatureCards = 0;
  let workingCollection = [...current.creatureCollection];

  return Array.from({ length: CREATURE_PACK_CARD_COUNT }, (_, slotIndex) => {
    const tier = chooseTierForSlot(slotIndex, seed, slotWeights);
    const remainingSlotsIncludingThis = CREATURE_PACK_CARD_COUNT - slotIndex;
    const remainingNewNeeded = Math.max(0, guaranteedNewTarget - newCreatureCards);
    const requireUnownedFallback = remainingNewNeeded > 0 && remainingSlotsIncludingThis <= remainingNewNeeded;
    const creature = chooseCreatureForSlot({
      slotIndex,
      tier,
      seed,
      usedCreatureIds,
      originallyOwnedCreatureIds,
      preferUnowned: remainingNewNeeded > 0,
      requireUnownedFallback,
    });
    usedCreatureIds.add(creature.id);
    const copiesBefore = getCopies(workingCollection, creature.id);
    if (copiesBefore < 1) newCreatureCards += 1;
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
