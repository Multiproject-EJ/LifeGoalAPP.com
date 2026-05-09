/**
 * Pure sorting utilities for the 4-circle TimeBoundOffer row.
 *
 * Extracted from TimeBoundOfferRow.tsx so they can be unit-tested
 * without a React rendering environment.
 */

export type TimeBoundOfferSortable = {
  isCollected: boolean;
  isVisible: boolean;
  expiresAtMs: number | null;
  sortPriority?: number;
  slotRole?: 'core' | 'filler';
};

/**
 * Sort a group of offers: active (uncollected) first, then collected.
 *
 * Within each group, sort by explicit `sortPriority` ascending (primary),
 * then by `expiresAtMs` ascending (soonest-expiring first) as tiebreaker.
 * Using priority as primary key prevents expiresAtMs from accidentally
 * displacing lower-priority items.
 */
export function sortByStateAndPriority<T extends TimeBoundOfferSortable>(source: T[]): T[] {
  const compare = (a: T, b: T): number => {
    const aPri = a.sortPriority ?? 999;
    const bPri = b.sortPriority ?? 999;
    if (aPri !== bPri) return aPri - bPri;
    const aExpiry = a.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
    const bExpiry = b.expiresAtMs ?? Number.MAX_SAFE_INTEGER;
    return aExpiry - bExpiry;
  };

  const active = source.filter((o) => !o.isCollected).sort(compare);
  const collected = source.filter((o) => o.isCollected).sort(compare);
  return [...active, ...collected];
}

/**
 * Given all visible offers, select and sort up to 4 for display.
 *
 * Core offers (slotRole === 'core' or undefined) fill the 4 slots first.
 * Filler offers only fill remaining slots when there are fewer than 4 core.
 */
export function selectOffersForDisplay<T extends TimeBoundOfferSortable>(offers: T[]): T[] {
  const visible = offers.filter((o) => o.isVisible);
  const coreOffers = visible.filter((o) => (o.slotRole ?? 'core') === 'core');
  const fillerOffers = visible.filter((o) => o.slotRole === 'filler');

  const sortedCore = sortByStateAndPriority(coreOffers).slice(0, 4);
  if (sortedCore.length >= 4) {
    return sortedCore;
  }

  const remainingSlots = 4 - sortedCore.length;
  const sortedFiller = sortByStateAndPriority(fillerOffers).slice(0, remainingSlots);
  return [...sortedCore, ...sortedFiller];
}
