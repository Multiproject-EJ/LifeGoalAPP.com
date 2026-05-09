import { sortByStateAndPriority, selectOffersForDisplay, type TimeBoundOfferSortable } from '../timeBoundOfferSort';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

function make(overrides: Partial<TimeBoundOfferSortable> = {}): TimeBoundOfferSortable {
  return {
    isCollected: false,
    isVisible: true,
    expiresAtMs: null,
    sortPriority: 5,
    slotRole: 'core',
    ...overrides,
  };
}

export function runTimeBoundOfferSortTests(): void {
  // ------------------------------------------------------------------
  // sortByStateAndPriority
  // ------------------------------------------------------------------

  // Active items sort before collected items
  {
    const active = make({ isCollected: false, sortPriority: 10 });
    const done = make({ isCollected: true, sortPriority: 1 });
    const result = sortByStateAndPriority([done, active]);
    assertEqual(result[0], active, 'active item should precede done item regardless of sortPriority');
    assertEqual(result[1], done, 'done item should follow active item');
  }

  // Within active group: lower sortPriority wins (sorted ascending)
  {
    const high = make({ sortPriority: 1 });
    const low = make({ sortPriority: 3 });
    const mid = make({ sortPriority: 2 });
    const result = sortByStateAndPriority([low, high, mid]);
    assertEqual(result[0], high, 'priority 1 should be first in active group');
    assertEqual(result[1], mid, 'priority 2 should be second');
    assertEqual(result[2], low, 'priority 3 should be third');
  }

  // Priority is the primary sort key — equal priority falls back to expiresAtMs
  {
    const soonerExpiry = make({ sortPriority: 2, expiresAtMs: 1000 });
    const laterExpiry = make({ sortPriority: 2, expiresAtMs: 9999 });
    const nullExpiry = make({ sortPriority: 2, expiresAtMs: null });
    const result = sortByStateAndPriority([nullExpiry, laterExpiry, soonerExpiry]);
    assertEqual(result[0], soonerExpiry, 'sooner expiresAtMs should sort first when priority ties');
    assertEqual(result[1], laterExpiry, 'later expiresAtMs should sort second');
    assertEqual(result[2], nullExpiry, 'null expiresAtMs (MAX_SAFE_INTEGER) sorts last in tie');
  }

  // Items with no sortPriority default to 999 (de-prioritized)
  {
    const noPriority = make({ sortPriority: undefined });
    const explicit = make({ sortPriority: 0 });
    const result = sortByStateAndPriority([noPriority, explicit]);
    assertEqual(result[0], explicit, 'explicit priority 0 should beat undefined (999) priority');
  }

  // Within collected group: same priority-first sort applies
  {
    const done1 = make({ isCollected: true, sortPriority: 1 });
    const done2 = make({ isCollected: true, sortPriority: 3 });
    const result = sortByStateAndPriority([done2, done1]);
    assertEqual(result[0], done1, 'lower priority number should sort first within done group');
  }

  // Empty input returns empty
  {
    const result = sortByStateAndPriority([]);
    assertEqual(result.length, 0, 'empty input should return empty array');
  }

  // ------------------------------------------------------------------
  // selectOffersForDisplay
  // ------------------------------------------------------------------

  // Returns at most 4 items from the visible set
  {
    const items = Array.from({ length: 7 }, (_, i) => make({ sortPriority: i }));
    const result = selectOffersForDisplay(items);
    assertEqual(result.length, 4, 'selectOffersForDisplay should return at most 4 items');
  }

  // Invisible items are excluded
  {
    const visible = make({ isVisible: true, sortPriority: 0 });
    const hidden = make({ isVisible: false, sortPriority: 1 });
    const result = selectOffersForDisplay([visible, hidden]);
    assertEqual(result.length, 1, 'hidden offers should be excluded');
    assertEqual(result[0], visible, 'only the visible offer should appear');
  }

  // Core fills before filler — filler only enters if core < 4
  {
    const core1 = make({ slotRole: 'core', sortPriority: 0 });
    const core2 = make({ slotRole: 'core', sortPriority: 1 });
    const core3 = make({ slotRole: 'core', sortPriority: 2 });
    const core4 = make({ slotRole: 'core', sortPriority: 3 });
    const filler = make({ slotRole: 'filler', sortPriority: 0 });
    const result = selectOffersForDisplay([filler, core4, core3, core2, core1]);
    assertEqual(result.length, 4, 'should return exactly 4 items when 4 core are available');
    assertEqual(result.includes(filler), false, 'filler should not appear when core fills 4 slots');
  }

  // Filler backfills empty slots when core < 4
  {
    const core = make({ slotRole: 'core', sortPriority: 0 });
    const filler1 = make({ slotRole: 'filler', sortPriority: 1 });
    const filler2 = make({ slotRole: 'filler', sortPriority: 2 });
    const result = selectOffersForDisplay([core, filler1, filler2]);
    assertEqual(result.length, 3, 'should return 3 items when only 1 core + 2 fillers exist');
    assertEqual(result[0], core, 'core should come first');
    assertEqual(result.includes(filler1), true, 'first filler should be included in backfill');
  }

  // Active items beat done items even when filler is also present
  {
    const activeFiller = make({ slotRole: 'filler', isCollected: false, sortPriority: 0 });
    const doneCore = make({ slotRole: 'core', isCollected: true, sortPriority: 99 });
    const activeCore = make({ slotRole: 'core', isCollected: false, sortPriority: 1 });
    const result = selectOffersForDisplay([activeFiller, doneCore, activeCore]);
    // 2 core items fit into core slots; filler only gets remaining
    assertEqual(result[0], activeCore, 'active core should be first');
    assertEqual(result[1], doneCore, 'done core should follow active core');
    assertEqual(result[2], activeFiller, 'active filler fills last remaining slot');
  }

  // Returns fewer than 4 when there are not enough visible offers (no padding at this level)
  {
    const item = make({ sortPriority: 0 });
    const result = selectOffersForDisplay([item]);
    assertEqual(result.length, 1, 'result should contain only 1 item when only 1 is visible');
  }

  // slotRole defaults to core when undefined
  {
    const noRole = make({ slotRole: undefined, sortPriority: 0 });
    const filler = make({ slotRole: 'filler', sortPriority: 1 });
    // With 4 slots and only 2 items, both should appear
    const result = selectOffersForDisplay([noRole, filler]);
    assertEqual(result.includes(noRole), true, 'offer with no slotRole should be treated as core');
  }
}
