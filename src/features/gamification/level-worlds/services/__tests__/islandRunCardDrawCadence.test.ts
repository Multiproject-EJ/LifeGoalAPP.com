/**
 * Tests for the caretaker milestone-clue cadence: every fifth island, once per
 * visit, with a fresh allowance at the next milestone.
 */
import {
  CARD_DRAW_MAX_PER_ISLAND,
  CARETAKER_CLUE_ISLAND_INTERVAL,
  decideCardDraw,
  initialCardDrawCadenceState,
  isCaretakerClueIsland,
} from '../islandRunCardDrawCadence';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunCardDrawCadenceTests: TestCase[] = [
  {
    name: 'only every fifth island is a caretaker clue milestone',
    run: () => {
      assertEqual(CARETAKER_CLUE_ISLAND_INTERVAL, 5, 'Expected five-island milestone cadence');
      for (let island = 1; island <= 20; island += 1) {
        assertEqual(isCaretakerClueIsland(island), island % 5 === 0, `Unexpected milestone result for island ${island}`);
      }
    },
  },
  {
    name: 'ordinary islands never open the clue encounter',
    run: () => {
      const decision = decideCardDraw(initialCardDrawCadenceState(), { islandNumber: 3, rollIndex: 10 });
      assert(!decision.show, 'ordinary island should not show');
      assertEqual(decision.reason, 'not_milestone_island', 'reason is milestone gating');
      assertEqual(decision.nextState.drawsThisIsland, 0, 'suppressed encounter is not counted');
    },
  },
  {
    name: 'first landing on a milestone island opens once',
    run: () => {
      const decision = decideCardDraw(initialCardDrawCadenceState(), { islandNumber: 5, rollIndex: 10 });
      assert(decision.show, 'milestone encounter should show');
      assertEqual(decision.nextState.drawsThisIsland, 1, 'encounter counted');
      assertEqual(decision.nextState.lastShownRollIndex, 10, 'roll recorded');
    },
  },
  {
    name: 'milestone island allows only one encounter per visit',
    run: () => {
      let state = initialCardDrawCadenceState();
      let shown = 0;
      for (let attempt = 0; attempt < CARD_DRAW_MAX_PER_ISLAND + 3; attempt += 1) {
        const decision = decideCardDraw(state, { islandNumber: 5, rollIndex: attempt + 1 });
        state = decision.nextState;
        if (decision.show) shown += 1;
        else assertEqual(decision.reason, 'island_cap', 'later landings are capped');
      }
      assertEqual(shown, CARD_DRAW_MAX_PER_ISLAND, 'shows exactly the per-island cap');
    },
  },
  {
    name: 'moving to a new island resets the counters',
    run: () => {
      let state = initialCardDrawCadenceState();
      state = decideCardDraw(state, { islandNumber: 5, rollIndex: 7 }).nextState;
      assert(!decideCardDraw(state, { islandNumber: 5, rollIndex: 100 }).show, 'island 5 is capped');
      // A new milestone island gets a fresh encounter allowance.
      const fresh = decideCardDraw(state, { islandNumber: 10, rollIndex: 1 });
      assert(fresh.show, 'new milestone island resets and shows');
      assertEqual(fresh.nextState.islandNumber, 10, 'state now tracks island 10');
      assertEqual(fresh.nextState.drawsThisIsland, 1, 'fresh island count');
    },
  },
];
