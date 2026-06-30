import { TECH_COLLECTION_CELL_COUNT } from './islandRunTechCollection';

export type IslandTechnologyFragmentVisual = {
  placeholder: string;
  ariaLabel: string;
  fallbackEmoji: string;
  imageSrc?: string;
  alt: string;
  className?: string;
};

export type VisibleTechnologyFragment = {
  tileIndex: number;
  fragmentSlot: number;
  placeholder: string;
  ariaLabel: string;
};

export const CONCORD_FRAGMENT_PLACEHOLDERS = [
  '💠',
  '🔷',
  '🔹',
  '🧿',
  '⚙️',
  '🔮',
  '💎',
  '🌀',
  '✨',
] as const;

const ISLAND_1_CONCORD_FRAGMENT_VISUALS: Readonly<Record<number, IslandTechnologyFragmentVisual>> = Object.freeze(
  Object.fromEntries(
    CONCORD_FRAGMENT_PLACEHOLDERS.map((placeholder, index) => [
      index,
      {
        placeholder,
        fallbackEmoji: placeholder,
        ariaLabel: `Technology fragment available: Concord fragment ${index + 1}`,
        alt: `Concord fragment ${index + 1}`,
      },
    ]),
  ) as Record<number, IslandTechnologyFragmentVisual>,
);

const VISUALS_BY_ISLAND: Readonly<Record<number, Readonly<Record<number, IslandTechnologyFragmentVisual>>>> = Object.freeze({
  1: ISLAND_1_CONCORD_FRAGMENT_VISUALS,
});

export function getTechnologyFragmentVisual(
  islandNumber: number,
  fragmentSlot: number,
): IslandTechnologyFragmentVisual | null {
  const normalizedIsland = Math.floor(islandNumber);
  const normalizedSlot = Math.floor(fragmentSlot);
  if (!Number.isFinite(normalizedIsland) || !Number.isFinite(normalizedSlot)) return null;
  if (normalizedSlot < 0 || normalizedSlot >= TECH_COLLECTION_CELL_COUNT) return null;
  return VISUALS_BY_ISLAND[normalizedIsland]?.[normalizedSlot] ?? null;
}

export function getTechnologyFragmentPlaceholder(
  islandNumber: number,
  fragmentSlot: number,
): string {
  return getTechnologyFragmentVisual(islandNumber, fragmentSlot)?.placeholder ?? '';
}
