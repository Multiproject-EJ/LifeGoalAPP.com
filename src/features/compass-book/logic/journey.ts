export const COMPASS_BOOK_RECEIPT_ISLAND_NUMBER = 8;
export const COMPASS_BOOK_FIRST_SIGNAL_COUNT = 8;
export const COMPASS_BOOK_VISIBLE_FRAGMENT_START_ISLAND_NUMBER = 9;

export function isCompassFirstSignalIsland(islandNumber: number): boolean {
  return Number.isFinite(islandNumber)
    && Math.floor(islandNumber) >= 1
    && Math.floor(islandNumber) <= COMPASS_BOOK_FIRST_SIGNAL_COUNT;
}

export function getCompassActivityJourneyLabel(islandNumber: number): string {
  const safeIslandNumber = Math.max(1, Math.floor(Number.isFinite(islandNumber) ? islandNumber : 1));
  return isCompassFirstSignalIsland(safeIslandNumber)
    ? `First Signal ${safeIslandNumber}`
    : `Island ${safeIslandNumber} Fragment`;
}
