/**
 * Pure sorting utilities for the horizontally scrollable TimeBoundOffer row.
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
 * Given all visible offers, sort them for display in the horizontal scroller.
 *
 * Core offers (slotRole === 'core' or undefined) are shown before filler offers.
 * Filler offers are no longer capped to the old fixed grid because the
 * row can scroll horizontally when more than four circles are available.
 */
export function selectOffersForDisplay<T extends TimeBoundOfferSortable>(offers: T[]): T[] {
  const visible = offers.filter((o) => o.isVisible);
  const coreOffers = visible.filter((o) => (o.slotRole ?? 'core') === 'core');
  const fillerOffers = visible.filter((o) => o.slotRole === 'filler');

  return [
    ...sortByStateAndPriority(coreOffers),
    ...sortByStateAndPriority(fillerOffers),
  ];
}
