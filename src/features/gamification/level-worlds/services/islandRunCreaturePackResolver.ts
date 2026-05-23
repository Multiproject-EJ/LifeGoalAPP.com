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

export function buildCreaturePackCards(options: {
  current: IslandRunGameStateRecord;
  openedAtMs: number;
  userId: string;
  seedScope: string;
  slotWeights: CreaturePackWeightedTier[][];
}): CreaturePackCardReveal[] {
  const {
    current,
    openedAtMs,
    userId,
    seedScope,
    slotWeights,
  } = options;
  const seed = [
    userId,
    seedScope,
    current.currentIslandNumber,
    current.cycleIndex,
    current.runtimeVersion,
    openedAtMs,
  ].join(':');
  const usedCreatureIds = new Set<string>();
  let workingCollection = [...current.creatureCollection];

  return Array.from({ length: CREATURE_PACK_CARD_COUNT }, (_, slotIndex) => {
    const tier = chooseTierForSlot(slotIndex, seed, slotWeights);
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
