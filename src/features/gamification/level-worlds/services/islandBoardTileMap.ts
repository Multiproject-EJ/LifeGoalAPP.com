// islandBoardTileMap.ts
// Generates a topology-aware tile type map for a given island run.
//
// IMPORTANT: Per the canonical gameplay contract, the 5 stops (Hatchery, Habit,
// Mystery, Wisdom, Boss) are EXTERNAL side-quest structures. The player piece
// never lands on a landmark structure and there is no `'stop'` tile type on the
// 36-tile ring. Stops are opened by the orbit-stop HUD buttons, or by the four
// landmark-door access tiles defined below.
//
// Landmark-door tiles open the canonical landmark modal without awarding tile
// rewards or changing stop progression. Stop completion remains owned by the
// canonical stop services.

import { resolveIslandBoardProfile, type IslandBoardProfileId } from './islandBoardProfiles';
import { getIslandRunRarity, type IslandRunIslandRarity } from './islandRunIslandMetadata';
import { TRAFFIC_LIGHT_TILE_INDEX } from './islandRunTrafficLightTile';
import { isCaretakerClueIsland } from './islandRunCardDrawCadence';

export type IslandLandmarkDoorStopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';

export type IslandTileType = 'currency' | 'chest' | 'hazard' | 'micro' | 'encounter' | 'card' | 'landmark_door' | 'traffic_light' | 'build_discount' | 'free_ticket';

export type IslandRarity = IslandRunIslandRarity;

export type IslandTileMapEntry = {
  index: number;
  tileType: IslandTileType;
  /** Present only for landmark-door tiles; routes landing to the canonical landmark modal. */
  doorStopId?: IslandLandmarkDoorStopId;
  /** Present when a door tile belongs to the currently active landmark cluster. */
  isActiveDoorCluster?: boolean;
};

export type IslandLandmarkDoorTileConfig = {
  tileIndex: number;
  stopId: Exclude<IslandLandmarkDoorStopId, 'boss'>;
};

export type IslandLandmarkDoorClusterStopId = Exclude<IslandLandmarkDoorStopId, 'boss'>;

/**
 * Four outer ring tiles nearest the four outer landmark corner anchors. They
 * become landmark doors; once the boss is open, all four route to the boss
 * instead.
 *
 * Indices are for the 36-tile ring (spark36_ring, tileCount 36): each is the
 * ring tile closest to its diagonal corner anchor in OUTER_STOP_ANCHORS,
 * spaced evenly 9 tiles apart. (Previously 36/6/16/26 on the 40-tile ring —
 * note index 36 is out of range once the ring drops to 36 tiles.)
 */
export const LANDMARK_DOOR_TILE_CONFIGS: readonly IslandLandmarkDoorTileConfig[] = Object.freeze([
  { tileIndex: 32, stopId: 'hatchery' },
  { tileIndex: 5, stopId: 'habit' },
  { tileIndex: 14, stopId: 'mystery' },
  { tileIndex: 23, stopId: 'wisdom' },
]);


const EXPANDABLE_LANDMARK_DOOR_STOP_IDS: readonly IslandLandmarkDoorClusterStopId[] = ['hatchery', 'habit', 'mystery', 'wisdom'];

/**
 * Returns the non-boss landmark whose circular-board door tiles should glow as
 * the immediate next interaction target. This includes Hatchery when it is the
 * fresh-island active landmark, so players can discover/set the egg by landing
 * on the hatchery door tile or either neighboring tile instead of receiving an
 * automatic egg modal on island arrival. Ticket-required landmarks count here:
 * paying the ticket is the next required move to open that landmark, so the
 * same entrance tiles should pulse before and after the ticket is paid.
 */
export function resolveExpandedLandmarkDoorStopIdForStatuses(
  statusesByIndex: readonly (string | null | undefined)[] | null | undefined,
): IslandLandmarkDoorClusterStopId | undefined {
  if (!statusesByIndex) return undefined;
  for (let stopIndex = 0; stopIndex <= 3; stopIndex += 1) {
    const status = statusesByIndex[stopIndex];
    if (status === 'active' || status === 'ticket_required') {
      return EXPANDABLE_LANDMARK_DOOR_STOP_IDS[stopIndex];
    }
  }
  return undefined;
}

/**
 * Boss phase is a special door-routing mode: once the Boss is active, or once
 * the Boss ticket is the next affordable payment, the four landmark-door tiles
 * should all advertise and route to the Boss modal instead of opening dormant
 * door challenges.
 */
export function resolveAllLandmarkDoorsRouteToBoss(input: {
  bossStatus: string | null | undefined;
  essence: number;
  bossTicketCost: number | null | undefined;
}): boolean {
  if (input.bossStatus === 'active') return true;
  if (input.bossStatus !== 'ticket_required') return false;
  const essence = Number.isFinite(input.essence) ? Math.max(0, Math.floor(input.essence)) : 0;
  const cost = typeof input.bossTicketCost === 'number' && Number.isFinite(input.bossTicketCost)
    ? Math.max(0, Math.floor(input.bossTicketCost))
    : null;
  return cost !== null && essence >= cost;
}

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

// One milestone ring tile becomes a caretaker clue encounter. Fractions keep
// its placement topology-aware instead of depending on the current 36-tile
// production count. Non-milestone islands receive an ordinary economy tile at
// this position, so there are no dead/suppressed card spaces.
// Tile 17 is deliberately clear of the four expandable landmark-door clusters.
const CARD_STATION_START_FRACTION = 17 / 36;
const BUILD_DISCOUNT_TILE_FRACTION = 0.35;
const FREE_TICKET_TILE_FRACTION = 0.85;

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

/** Deterministic seeded pseudo-random number in [0, 1).
 *
 * Guards against seed=0: xorshift from 0 produces 0, which would make every
 * downstream consumer pick `TILE_POOL[0]` (= `'currency'`) for every tile on
 * that island. Production callers always pass a positive island number, but
 * any dev/QA path that feeds `islandNumber = 0` (or `tileIndex = 0` in a
 * seed that happens to resolve to 0) would silently produce a degenerate
 * all-`currency` board. Falling back to `1` preserves determinism while
 * eliminating the degenerate case.
 */
function seededRandom(seed: number): number {
  // Simple xorshift-based hash
  let s = (seed | 0) || 1;
  s ^= s << 13;
  s ^= s >> 17;
  s ^= s << 5;
  return ((s >>> 0) % 100000) / 100000;
}

/**
 * Returns the rarity for a given island number.
 *
 * Canonical special-island schedule:
 * 5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120.
 *
 * Compatibility note:
 * - We keep `rare` as a subset of special islands (those divisible by 10),
 *   and classify the rest as `seasonal`.
 * - Any island outside the canonical list is `normal`.
 */
export function getIslandRarity(islandNumber: number): IslandRarity {
  return getIslandRunRarity(islandNumber);
}

function computeCardStationIndicesForProfile(tileCount: number, islandNumber: number): Set<number> {
  const indices = new Set<number>();
  if (tileCount <= 0 || !isCaretakerClueIsland(islandNumber)) return indices;
  const startIndex = Math.min(tileCount - 1, Math.max(0, Math.floor(CARD_STATION_START_FRACTION * tileCount)));
  indices.add(startIndex);
  return indices;
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
 * Overlays the four landmark-door tiles onto an already generated tile map.
 * Door tiles open canonical landmark modals and intentionally do not grant
 * essence/reward-bar tile payouts.
 */
export function applyLandmarkDoorTiles(
  tileMap: IslandTileMapEntry[],
  options?: {
    allDoorsRouteToBoss?: boolean;
    expandedActiveStopId?: IslandLandmarkDoorClusterStopId;
  },
): IslandTileMapEntry[] {
  const doorByIndex = new Map<number, IslandLandmarkDoorStopId>();
  const baseDoorIndices = new Set(LANDMARK_DOOR_TILE_CONFIGS.map((config) => config.tileIndex));
  const activeDoorClusterIndices = new Set<number>();
  const tileCount = tileMap.length;

  for (const config of LANDMARK_DOOR_TILE_CONFIGS) {
    const doorStopId = options?.allDoorsRouteToBoss ? 'boss' : config.stopId;
    doorByIndex.set(config.tileIndex, doorStopId);

    if (options?.allDoorsRouteToBoss) {
      activeDoorClusterIndices.add(config.tileIndex);
    }

    if (!options?.allDoorsRouteToBoss && options?.expandedActiveStopId === config.stopId && tileCount > 0) {
      activeDoorClusterIndices.add(config.tileIndex);
      for (const offset of [-1, 1]) {
        const neighborTileIndex = (config.tileIndex + offset + tileCount) % tileCount;
        if (baseDoorIndices.has(neighborTileIndex)) continue;
        doorByIndex.set(neighborTileIndex, config.stopId);
        activeDoorClusterIndices.add(neighborTileIndex);
      }
    }
  }

  return tileMap.map((entry) => {
    const doorStopId = doorByIndex.get(entry.index);
    if (!doorStopId) return entry;
    return {
      index: entry.index,
      tileType: 'landmark_door',
      doorStopId,
      ...(activeDoorClusterIndices.has(entry.index) ? { isActiveDoorCluster: true } : {}),
    };
  });
}

/**
 * Generates a base economy tile map for the given island run parameters.
 * Landmark-door overlays are applied separately by applyLandmarkDoorTiles so
 * runtime boss-open state can reroute all doors without mutating this base map.
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
  const cardStationIndices = computeCardStationIndicesForProfile(tileCount, islandNumber);
  const buildDiscountTileIndex = Math.min(tileCount - 1, Math.max(0, Math.floor(BUILD_DISCOUNT_TILE_FRACTION * tileCount)));
  const freeTicketTileIndex = Math.min(tileCount - 1, Math.max(0, Math.floor(FREE_TICKET_TILE_FRACTION * tileCount)));
  const tiles: IslandTileMapEntry[] = [];

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
    if (tileIndex === TRAFFIC_LIGHT_TILE_INDEX) {
      tiles.push({ index: tileIndex, tileType: 'traffic_light' });
      continue;
    }

    if (tileIndex === buildDiscountTileIndex) {
      tiles.push({ index: tileIndex, tileType: 'build_discount' });
      continue;
    }

    if (tileIndex === freeTicketTileIndex) {
      tiles.push({ index: tileIndex, tileType: 'free_ticket' });
      continue;
    }

    if (cardStationIndices.has(tileIndex)) {
      tiles.push({ index: tileIndex, tileType: 'card' });
      continue;
    }

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
