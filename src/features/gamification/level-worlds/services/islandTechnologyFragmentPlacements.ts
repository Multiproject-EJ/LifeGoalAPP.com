import { TECH_COLLECTION_CELL_COUNT } from './islandRunTechCollection';
import { getTechnologyFragmentVisual, type VisibleTechnologyFragment } from './islandTechnologyFragmentVisuals';

export type IslandTechnologyFragmentPlacement = {
  tileIndex: number;
  fragmentSlot: number;
};

/**
 * Island 1: The Concord is recovered as nine fixed physical board fragments.
 *
 * These tiles reuse the existing board pop-out collectible structure on normal
 * reachable reward tiles. They deliberately avoid landmark doors (6/16/26/36),
 * traffic-light tile 34, hazards, and encounter overlays so the fragment remains
 * an additive one-time pickup layered onto ordinary tile rewards.
 */
export const ISLAND_1_CONCORD_FRAGMENT_PLACEMENTS: readonly IslandTechnologyFragmentPlacement[] = Object.freeze([
  { tileIndex: 1, fragmentSlot: 0 },
  { tileIndex: 5, fragmentSlot: 1 },
  { tileIndex: 9, fragmentSlot: 2 },
  { tileIndex: 13, fragmentSlot: 3 },
  { tileIndex: 17, fragmentSlot: 4 },
  { tileIndex: 21, fragmentSlot: 5 },
  { tileIndex: 25, fragmentSlot: 6 },
  { tileIndex: 29, fragmentSlot: 7 },
  { tileIndex: 33, fragmentSlot: 8 },
] as const);

const PLACEMENTS_BY_ISLAND: Readonly<Record<number, readonly IslandTechnologyFragmentPlacement[]>> = Object.freeze({
  1: ISLAND_1_CONCORD_FRAGMENT_PLACEMENTS,
});

export function listIslandTechnologyFragmentPlacements(islandNumber: number): readonly IslandTechnologyFragmentPlacement[] {
  return PLACEMENTS_BY_ISLAND[Math.floor(islandNumber)] ?? [];
}

export function getIslandTechnologyFragmentPlacement(
  islandNumber: number,
  tileIndex: number,
): IslandTechnologyFragmentPlacement | null {
  const normalizedTileIndex = Math.floor(tileIndex);
  if (!Number.isFinite(normalizedTileIndex)) return null;
  return listIslandTechnologyFragmentPlacements(islandNumber).find((placement) => placement.tileIndex === normalizedTileIndex) ?? null;
}

export function getTechnologyFragmentSlotForTile(islandNumber: number, tileIndex: number): number | null {
  return getIslandTechnologyFragmentPlacement(islandNumber, tileIndex)?.fragmentSlot ?? null;
}

export function isTechnologyFragmentCollected(
  record: Readonly<Record<string, readonly number[]>> | null | undefined,
  islandNumber: number,
  fragmentSlot: number,
): boolean {
  const islandKey = String(Math.floor(islandNumber));
  const normalizedSlot = Math.floor(fragmentSlot);
  if (!Number.isFinite(normalizedSlot) || normalizedSlot < 0 || normalizedSlot >= TECH_COLLECTION_CELL_COUNT) return false;
  return new Set(record?.[islandKey] ?? []).has(normalizedSlot);
}

export function listVisibleTechnologyFragmentTileIndices(
  islandNumber: number,
  collectedSlots: ReadonlySet<number> | Iterable<number>,
): Set<number> {
  return new Set(listVisibleTechnologyFragments(islandNumber, collectedSlots).map((fragment) => fragment.tileIndex));
}

export function listVisibleTechnologyFragments(
  islandNumber: number,
  collectedSlots: ReadonlySet<number> | Iterable<number>,
): VisibleTechnologyFragment[] {
  const collected = collectedSlots instanceof Set ? collectedSlots : new Set(collectedSlots);
  return listIslandTechnologyFragmentPlacements(islandNumber)
    .filter((placement) => !collected.has(placement.fragmentSlot))
    .map((placement) => {
      const visual = getTechnologyFragmentVisual(islandNumber, placement.fragmentSlot);
      if (!visual) return null;
      return {
        tileIndex: placement.tileIndex,
        fragmentSlot: placement.fragmentSlot,
        placeholder: visual.placeholder,
        ariaLabel: visual.ariaLabel,
      };
    })
    .filter((fragment): fragment is VisibleTechnologyFragment => fragment !== null);
}
