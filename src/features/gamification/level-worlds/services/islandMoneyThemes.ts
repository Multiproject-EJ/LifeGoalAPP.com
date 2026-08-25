export const ISLAND_MONEY_PALETTE_IDS = ['prism', 'citrus', 'candy', 'metals'] as const;

export type IslandMoneyPaletteId = (typeof ISLAND_MONEY_PALETTE_IDS)[number];
export type IslandMoneyNoteTone = 0 | 1 | 2 | 3;

export const ISLAND_MONEY_PALETTE_LABELS: Record<IslandMoneyPaletteId, string> = {
  prism: 'Prism Pop',
  citrus: 'Citrus Coast',
  candy: 'Candy Glow',
  metals: 'Metal + Gem',
};

function normalizeIslandNumber(islandNumber: number): number {
  if (!Number.isFinite(islandNumber)) return 1;
  return Math.max(1, Math.floor(islandNumber));
}

/**
 * Presentation-only island currency identity. The four approved note families
 * repeat evenly through the 120-island route without adding persisted state.
 */
export function getIslandMoneyPaletteId(islandNumber: number): IslandMoneyPaletteId {
  const normalized = normalizeIslandNumber(islandNumber);
  return ISLAND_MONEY_PALETTE_IDS[(normalized - 1) % ISLAND_MONEY_PALETTE_IDS.length];
}

export function getIslandMoneyPaletteLabel(islandNumber: number): string {
  return ISLAND_MONEY_PALETTE_LABELS[getIslandMoneyPaletteId(islandNumber)];
}
