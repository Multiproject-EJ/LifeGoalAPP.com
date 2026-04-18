// islandBoardTileMap.ts
// Generates a topology-aware tile type map for a given island run.

import { resolveIslandBoardProfile, type IslandBoardProfileId } from './islandBoardProfiles';

export type IslandTileType = 'currency' | 'chest' | 'event' | 'hazard' | 'micro' | 'encounter' | 'stop';

export type IslandRarity = 'normal' | 'seasonal' | 'rare';

export type IslandTileMapEntry = {
  index: number;
  tileType: IslandTileType;
  stopId?: string;
};

const STOP_IDS = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'] as const;

// Encounter tile indices by island rarity.
// Normal: 1 tile (index 6, gated by dayIndex); Seasonal: 2 tiles; Rare: 2 tiles (always active).
const ENCOUNTER_INDICES: Record<IslandRarity, number[]> = {
  normal: [6],
  seasonal: [6, 11],
  rare: [6, 11],
};

// Non-stop tile pool (weighted). egg_shard tiles retired — shards only from reward bar/stop/boss.
const TILE_POOL: IslandTileType[] = [
  'currency',
  'currency',
  'currency',
  'chest',
  'chest',
  'event',
  'event',
  'hazard',
  'micro',
  'micro',
];

/** Deterministic seeded pseudo-random number in [0, 1) */
function seededRandom(seed: number): number {
  // Simple xorshift-based hash
  let s = seed | 0;
  s ^= s << 13;
  s ^= s >> 17;
  s ^= s << 5;
  return ((s >>> 0) % 100000) / 100000;
}

/**
 * Returns the rarity for a given island number:
 * - every 10th island = rare
 * - every 5th (not 10th) = seasonal
 * - rest = normal
 */
export function getIslandRarity(islandNumber: number): IslandRarity {
  if (islandNumber % 10 === 0) return 'rare';
  if (islandNumber % 5 === 0) return 'seasonal';
  return 'normal';
}

function getStopIndexMap(stopTileIndices: number[]): Record<number, string> {
  return stopTileIndices.reduce<Record<number, string>>((map, tileIndex, index) => {
    map[tileIndex] = STOP_IDS[index] ?? `stop_${index}`;
    return map;
  }, {});
}

/**
 * Generates a tile map for the given island run parameters.
 */
export function generateTileMap(
  islandNumber: number,
  rarity: IslandRarity,
  _themeId: string,
  dayIndex: number,
  options?: { profileId?: IslandBoardProfileId },
): IslandTileMapEntry[] {
  const boardProfile = resolveIslandBoardProfile(options?.profileId);
  const tileCount = boardProfile.tileCount;
  const stopIndices = getStopIndexMap([...boardProfile.stopTileIndices]);
  const tiles: IslandTileMapEntry[] = [];

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
    if (stopIndices[tileIndex] !== undefined) {
      tiles.push({ index: tileIndex, tileType: 'stop', stopId: stopIndices[tileIndex] });
      continue;
    }

    const encounterIndices = ENCOUNTER_INDICES[rarity].filter((index) => index < tileCount);
    if (encounterIndices.includes(tileIndex)) {
      if (rarity !== 'normal' || dayIndex >= 2) {
        tiles.push({ index: tileIndex, tileType: 'encounter' });
      } else {
        const seed = islandNumber * tileCount + tileIndex;
        const rand = seededRandom(seed);
        const poolIndex = Math.floor(rand * TILE_POOL.length);
        tiles.push({ index: tileIndex, tileType: TILE_POOL[poolIndex] });
      }
      continue;
    }

    const seed = islandNumber * tileCount + tileIndex;
    const rand = seededRandom(seed);
    const poolIndex = Math.floor(rand * TILE_POOL.length);
    tiles.push({ index: tileIndex, tileType: TILE_POOL[poolIndex] });
  }

  return tiles;
}
