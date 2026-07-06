/**
 * Tests for the Daily Clue Card cadence gate. Verifies the ring-tile draw is
 * throttled (cooldown + per-island cap) so it no longer fires on every
 * card-station landing, while still resetting cleanly per island.
 */
import {
  CARD_DRAW_COOLDOWN_ROLLS,
  CARD_DRAW_MAX_PER_ISLAND,
  decideCardDraw,
  initialCardDrawCadenceState,
} from '../islandRunCardDrawCadence';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunCardDrawCadenceTests: TestCase[] = [
  {
    name: 'first landing on an island always shows',
    run: () => {
      const decision = decideCardDraw(initialCardDrawCadenceState(), { islandNumber: 3, rollIndex: 10 });
      assert(decision.show, 'first draw should show');
      assertEqual(decision.nextState.drawsThisIsland, 1, 'draw counted');
      assertEqual(decision.nextState.lastShownRollIndex, 10, 'roll recorded');
    },
  },
  {
    name: 'a landing within the cooldown window is suppressed',
    run: () => {
      let state = initialCardDrawCadenceState();
      state = decideCardDraw(state, { islandNumber: 3, rollIndex: 10 }).nextState;
      // Adjacent card tile on the very next roll — must not fire again.
      const next = decideCardDraw(state, { islandNumber: 3, rollIndex: 11 });
      assert(!next.show, 'cooldown should suppress');
      assertEqual(next.reason, 'cooldown', 'reason is cooldown');
      assertEqual(next.nextState.drawsThisIsland, 1, 'suppressed draw is not counted');
    },
  },
  {
    name: 'a landing after the cooldown shows again',
    run: () => {
      let state = initialCardDrawCadenceState();
      state = decideCardDraw(state, { islandNumber: 3, rollIndex: 10 }).nextState;
      const after = decideCardDraw(state, { islandNumber: 3, rollIndex: 10 + CARD_DRAW_COOLDOWN_ROLLS });
      assert(after.show, 'past cooldown should show');
      assertEqual(after.nextState.drawsThisIsland, 2, 'second draw counted');
    },
  },
  {
    name: 'per-island cap stops further draws even past the cooldown',
    run: () => {
      let state = initialCardDrawCadenceState();
      let roll = 0;
      let shown = 0;
      // Fire far apart so cooldown never blocks; only the cap should.
      for (let attempt = 0; attempt < CARD_DRAW_MAX_PER_ISLAND + 3; attempt += 1) {
        roll += CARD_DRAW_COOLDOWN_ROLLS + 1;
        const decision = decideCardDraw(state, { islandNumber: 5, rollIndex: roll });
        state = decision.nextState;
        if (decision.show) shown += 1;
        else assertEqual(decision.reason, 'island_cap', 'suppression past cap is island_cap');
      }
      assertEqual(shown, CARD_DRAW_MAX_PER_ISLAND, 'shows exactly the per-island cap');
    },
  },
  {
    name: 'moving to a new island resets the counters',
    run: () => {
      let state = initialCardDrawCadenceState();
      // Exhaust island 5.
      let roll = 0;
      for (let i = 0; i < CARD_DRAW_MAX_PER_ISLAND; i += 1) {
        roll += CARD_DRAW_COOLDOWN_ROLLS + 1;
        state = decideCardDraw(state, { islandNumber: 5, rollIndex: roll }).nextState;
      }
      assert(!decideCardDraw(state, { islandNumber: 5, rollIndex: roll + 100 }).show, 'island 5 is capped');
      // New island — fresh allowance, even at a lower roll index.
      const fresh = decideCardDraw(state, { islandNumber: 6, rollIndex: 1 });
      assert(fresh.show, 'new island resets and shows');
      assertEqual(fresh.nextState.islandNumber, 6, 'state now tracks island 6');
      assertEqual(fresh.nextState.drawsThisIsland, 1, 'fresh island count');
    },
  },
];
