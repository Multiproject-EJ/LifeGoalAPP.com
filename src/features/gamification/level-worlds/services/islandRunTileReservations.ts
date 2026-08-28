/**
 * Deterministic reservation helpers for authored Island Run route objects.
 *
 * Mission objects are presentation metadata on ordinary economy tiles. They
 * must never occupy a landmark entrance, route-control tile, card station, or
 * encounter slot. Keeping this independent from islandBoardTileMap avoids a
 * map/mission import cycle and gives services and renderers the same answer.
 */

const PRODUCTION_TILE_COUNT = 36;

const fraction = (index: number) => index / PRODUCTION_TILE_COUNT;

// Reserve the complete possible three-tile landmark-door clusters. Only one
// cluster expands at a time, but route objects must not disappear when it does.
const LANDMARK_CLUSTER_FRACTIONS = [
  fraction(31), fraction(32), fraction(33),
  fraction(4), fraction(5), fraction(6),
  fraction(13), fraction(14), fraction(15),
  fraction(22), fraction(23), fraction(24),
] as const;

// Fixed controls plus every possible encounter/card slot. Reserving dormant
// variants keeps authored mission routes stable across day and rarity changes.
const SYSTEM_FRACTIONS = [
  fraction(19), // Traffic Light
  0.35, // Build Discount
  0.85, // Living Ticket
  fraction(17), // caretaker card station
  fraction(34), // normal encounter
  0.275, // seasonal / rare encounter A
  0.775, // seasonal / rare encounter B
] as const;

function resolveFractionIndex(tileCount: number, value: number): number {
  return Math.min(tileCount - 1, Math.max(0, Math.floor(value * tileCount)));
}

export function getIslandRunReservedTileIndices(tileCount: number): ReadonlySet<number> {
  const safeTileCount = Math.max(1, Math.floor(tileCount));
  return new Set(
    [...LANDMARK_CLUSTER_FRACTIONS, ...SYSTEM_FRACTIONS]
      .map((value) => resolveFractionIndex(safeTileCount, value)),
  );
}

/**
 * Resolve authored fractions to unique free route indices. On collision the
 * search alternates clockwise/counter-clockwise, preserving the authored
 * distribution while remaining deterministic.
 */
export function resolveCollisionFreeTileIndices(options: {
  tileCount: number;
  preferredFractions: readonly number[];
  reservedIndices?: ReadonlySet<number>;
}): number[] {
  const tileCount = Math.max(1, Math.floor(options.tileCount));
  const unavailable = new Set(options.reservedIndices ?? getIslandRunReservedTileIndices(tileCount));
  const resolved: number[] = [];

  for (const preferredFraction of options.preferredFractions) {
    const preferred = resolveFractionIndex(tileCount, preferredFraction);
    let chosen: number | null = null;
    for (let distance = 0; distance < tileCount; distance += 1) {
      const candidates = distance === 0
        ? [preferred]
        : [
            (preferred + distance) % tileCount,
            (preferred - distance + tileCount) % tileCount,
          ];
      chosen = candidates.find((candidate) => !unavailable.has(candidate)) ?? null;
      if (chosen !== null) break;
    }
    if (chosen === null) break;
    unavailable.add(chosen);
    resolved.push(chosen);
  }

  return resolved;
}

export function findIslandRunReservedTileCollisions(options: {
  tileCount: number;
  tileIndices: readonly number[];
}): number[] {
  const reserved = getIslandRunReservedTileIndices(options.tileCount);
  return options.tileIndices.filter((tileIndex) => reserved.has(tileIndex));
}
