// islandBoardTileMap.ts
// Generates the 17-tile type map for a given island run.

export type IslandTileType = 'currency' | 'chest' | 'event' | 'hazard' | 'egg_shard' | 'micro' | 'encounter' | 'stop';

export type IslandRarity = 'normal' | 'seasonal' | 'rare';

export type IslandTileMapEntry = {
  index: number;
  tileType: IslandTileType;
  stopId?: string;
};

// Canonical stop indices
const STOP_INDICES: Record<number, string> = {
  0: 'hatchery',
  4: 'minigame',
  8: 'market',
  12: 'utility',
  16: 'boss',
};

// Encounter tile indices by island rarity.
// Normal: 1 tile (index 6, gated by dayIndex); Seasonal: 2 tiles; Rare: 2 tiles (always active).
const ENCOUNTER_INDICES: Record<IslandRarity, number[]> = {
  normal: [6],
  seasonal: [6, 11],
  rare: [6, 11],
};

// Non-stop tile pool (weighted)
const TILE_POOL: IslandTileType[] = [
  'currency',
  'currency',
  'currency',
  'chest',
  'chest',
  'event',
  'event',
  'hazard',
  'egg_shard',
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

/**
 * Generates a 17-tile type map for the given island run parameters.
 */
export function generateTileMap(
  islandNumber: number,
  rarity: IslandRarity,
  _themeId: string,
  dayIndex: number,
): IslandTileMapEntry[] {
  const tiles: IslandTileMapEntry[] = [];

  for (let tileIndex = 0; tileIndex < 17; tileIndex++) {
    // Canonical stop tiles
    if (STOP_INDICES[tileIndex] !== undefined) {
      tiles.push({ index: tileIndex, tileType: 'stop', stopId: STOP_INDICES[tileIndex] });
      continue;
    }

    // Encounter tiles: indices defined per rarity.
    // Normal islands: encounter only when dayIndex >= 2; seasonal/rare always.
    const encounterIndices = ENCOUNTER_INDICES[rarity];
    if (encounterIndices.includes(tileIndex)) {
      if (rarity !== 'normal' || dayIndex >= 2) {
        tiles.push({ index: tileIndex, tileType: 'encounter' });
      } else {
        // Default to a non-encounter tile using seeded random
        const seed = islandNumber * 17 + tileIndex;
        const rand = seededRandom(seed);
        const poolIndex = Math.floor(rand * TILE_POOL.length);
        tiles.push({ index: tileIndex, tileType: TILE_POOL[poolIndex] });
      }
      continue;
    }

    // Non-stop tiles use deterministic seeded random
    const seed = islandNumber * 17 + tileIndex;
    const rand = seededRandom(seed);
    const poolIndex = Math.floor(rand * TILE_POOL.length);
    tiles.push({ index: tileIndex, tileType: TILE_POOL[poolIndex] });
  }

  return tiles;
}
