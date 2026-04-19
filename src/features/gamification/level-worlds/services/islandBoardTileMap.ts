// islandBoardTileMap.ts
// Generates a topology-aware tile type map for a given island run.
//
// IMPORTANT: Per the canonical gameplay contract, the 5 stops (Hatchery, Habit,
// Mystery, Wisdom, Boss) are EXTERNAL side-quest structures. The player piece
// never lands on a "stop tile" — there is no such thing as a `'stop'` tile
// type anywhere on the 40-tile ring. Stops are opened by tapping the orbit-stop
// HUD buttons (after paying the essence ticket price per islandRunStopTickets).
//
// The 40 board tiles exist purely to earn essence and feed the reward bar.

import { resolveIslandBoardProfile, type IslandBoardProfileId } from './islandBoardProfiles';

export type IslandTileType = 'currency' | 'chest' | 'hazard' | 'micro' | 'encounter';

export type IslandRarity = 'normal' | 'seasonal' | 'rare';

export type IslandTileMapEntry = {
  index: number;
  tileType: IslandTileType;
};

// Encounter tile placement relative to the board's tileCount.
// Normal islands: 1 encounter (gated by dayIndex).
// Seasonal / rare islands: 2 encounters, always active.
// Positions are chosen as fractions of the ring so they spread evenly on any
// tile count (profile-driven, per the canonical contract — no fixed indices).
const ENCOUNTER_FRACTIONS: Record<IslandRarity, number[]> = {
  normal: [0.15],
  seasonal: [0.275, 0.775],
  rare: [0.275, 0.775],
};

// Non-stop tile pool (weighted). Retired tile types:
//   - `egg_shard` (shards now only come from reward bar / stops / boss / egg sell).
//   - `event` (conflicted with the timed minigame terminology; the word "event"
//      is now reserved for the timed minigame rotation. Reward-bar progress that
//      used to come from `event` tiles is now fully covered by `micro`.)
// Weighting note: `micro` is intentionally the most common tile (matches
// contract §5D). `currency`/`chest` are the primary essence drivers; `hazard`
// stays rare so a hazard landing keeps its bite.
const TILE_POOL: IslandTileType[] = [
  'currency',
  'currency',
  'currency',
  'chest',
  'chest',
  'micro',
  'micro',
  'micro',
  'micro',
  'hazard',
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

function computeEncounterIndicesForProfile(rarity: IslandRarity, tileCount: number): Set<number> {
  const indices = new Set<number>();
  for (const fraction of ENCOUNTER_FRACTIONS[rarity]) {
    const tileIndex = Math.min(tileCount - 1, Math.max(0, Math.floor(fraction * tileCount)));
    indices.add(tileIndex);
  }
  return indices;
}

/**
 * Generates a tile map for the given island run parameters.
 *
 * Every tile on the ring is a feeding/event/hazard/encounter tile — there is
 * no `'stop'` tile type, ever. Stops live on the orbit HUD, not on the ring.
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
  const encounterIndices = computeEncounterIndicesForProfile(rarity, tileCount);
  const tiles: IslandTileMapEntry[] = [];

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
    if (encounterIndices.has(tileIndex)) {
      if (rarity !== 'normal' || dayIndex >= 2) {
        tiles.push({ index: tileIndex, tileType: 'encounter' });
        continue;
      }
      // Normal island on day 0/1: encounter tile falls back to a random pool tile.
    }

    const seed = islandNumber * tileCount + tileIndex;
    const rand = seededRandom(seed);
    const poolIndex = Math.floor(rand * TILE_POOL.length);
    tiles.push({ index: tileIndex, tileType: TILE_POOL[poolIndex] });
  }

  return tiles;
}
