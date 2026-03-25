import type { CreatureDefinition, ShipZone } from './creatureCatalog';
import {
  getArchetypeIdsForAffinity,
  getWeaknessSupportTagsForAffinity,
  type WeaknessSupportTag,
} from './creatureArchetypeBridge';

export interface PlayerHandContext {
  dominantArchetypeIds: string[];
  secondaryArchetypeIds: string[];
  supportArchetypeIds?: string[];
  weaknessTags: WeaknessSupportTag[];
  preferredShipZones?: ShipZone[];
}

export interface CreatureFitConfig {
  strengthWeight: number;
  healingWeight: number;
  zoneWeight: number;
  rarityBonusByTier: Record<'common' | 'rare' | 'mythic', number>;
}

export interface CreatureFitScore {
  creatureId: string;
  score: number;
  strengthMatch: number;
  healingMatch: number;
  zoneMatch: number;
  rarityBonus: number;
  matchedArchetypes: string[];
  matchedWeaknessTags: WeaknessSupportTag[];
}

export const DEFAULT_CREATURE_FIT_CONFIG: CreatureFitConfig = {
  strengthWeight: 0.6,
  healingWeight: 0.4,
  zoneWeight: 0.1,
  rarityBonusByTier: {
    common: 0,
    rare: 4,
    mythic: 8,
  },
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function normalizedIntersectionRatio(source: string[], target: string[]): number {
  if (source.length === 0 || target.length === 0) return 0;
  const sourceSet = new Set(source);
  let matches = 0;
  target.forEach((item) => {
    if (sourceSet.has(item)) matches += 1;
  });
  return matches / target.length;
}

export function computeCreatureFitScore(
  creature: CreatureDefinition,
  context: PlayerHandContext,
  config: CreatureFitConfig = DEFAULT_CREATURE_FIT_CONFIG,
): CreatureFitScore {
  const archetypeIds = getArchetypeIdsForAffinity(creature.affinity);
  const weaknessSupportTags = getWeaknessSupportTagsForAffinity(creature.affinity);

  const dominantScore = normalizedIntersectionRatio(archetypeIds, context.dominantArchetypeIds) * 100;
  const secondaryScore = normalizedIntersectionRatio(archetypeIds, context.secondaryArchetypeIds) * 100;
  const supportScore = normalizedIntersectionRatio(archetypeIds, context.supportArchetypeIds ?? []) * 100;

  const strengthMatch = clampScore((dominantScore * 0.55) + (secondaryScore * 0.35) + (supportScore * 0.1));

  const healingMatch = clampScore(normalizedIntersectionRatio(weaknessSupportTags, context.weaknessTags) * 100);

  const zoneMatch = context.preferredShipZones?.includes(creature.shipZone) ? 100 : 0;

  const weightedScore =
    (strengthMatch * config.strengthWeight) +
    (healingMatch * config.healingWeight) +
    (zoneMatch * config.zoneWeight) +
    (config.rarityBonusByTier[creature.tier] ?? 0);

  const matchedArchetypes = archetypeIds.filter((id) =>
    context.dominantArchetypeIds.includes(id) ||
    context.secondaryArchetypeIds.includes(id) ||
    (context.supportArchetypeIds ?? []).includes(id),
  );
  const matchedWeaknessTags = weaknessSupportTags.filter((tag) => context.weaknessTags.includes(tag));

  return {
    creatureId: creature.id,
    score: clampScore(weightedScore),
    strengthMatch,
    healingMatch,
    zoneMatch,
    rarityBonus: config.rarityBonusByTier[creature.tier] ?? 0,
    matchedArchetypes,
    matchedWeaknessTags,
  };
}

export function rankCreatureFitsForPlayer(
  catalog: CreatureDefinition[],
  context: PlayerHandContext,
  config: CreatureFitConfig = DEFAULT_CREATURE_FIT_CONFIG,
): CreatureFitScore[] {
  return catalog
    .map((creature) => computeCreatureFitScore(creature, context, config))
    .sort((a, b) => b.score - a.score || a.creatureId.localeCompare(b.creatureId));
}

export interface PerfectCompanionSeedContext {
  userId: string;
  cycleIndex: number;
  islandNumber: number;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

export function selectPerfectCompanions(
  rankedFits: CreatureFitScore[],
  maxCount: number,
  seedContext: PerfectCompanionSeedContext,
): CreatureFitScore[] {
  if (rankedFits.length === 0 || maxCount <= 0) return [];

  const safeCount = Math.min(Math.max(1, Math.floor(maxCount)), 3, rankedFits.length);
  const poolSize = Math.min(rankedFits.length, Math.max(safeCount * 3, safeCount));
  const pool = rankedFits.slice(0, poolSize);

  const seed = `${seedContext.userId}:${seedContext.cycleIndex}:${seedContext.islandNumber}`;
  const startIndex = hashSeed(seed) % pool.length;

  const selected: CreatureFitScore[] = [];
  const seen = new Set<string>();

  for (let offset = 0; offset < pool.length && selected.length < safeCount; offset += 1) {
    const candidate = pool[(startIndex + offset) % pool.length];
    if (!candidate || seen.has(candidate.creatureId)) continue;
    selected.push(candidate);
    seen.add(candidate.creatureId);
  }

  if (selected.length < safeCount) {
    for (const fallback of rankedFits) {
      if (selected.length >= safeCount) break;
      if (seen.has(fallback.creatureId)) continue;
      selected.push(fallback);
      seen.add(fallback.creatureId);
    }
  }

  return selected;
}
