import {
  CONCORD_COMPLETION_ROLL_CAP,
  CONCORD_SOFT_PITY_MISS_ROLLS,
  mergeConcordRollProtectionState,
  resolveConcordRollProtection,
  resolveInitialConcordRollProtectionState,
} from '../islandRunConcordRollProtection';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunConcordRollProtectionTests: TestCase[] = [
  {
    name: 'an exact landing recovers the visible fragment without waiting for pity',
    run: () => {
      const result = resolveConcordRollProtection({
        islandNumber: 1,
        tileCount: 36,
        landingTileIndex: 6,
        hopSequence: [2, 3, 4, 5, 6],
        collectedSlots: [],
        state: { rollsTaken: 0, rollsSinceFragment: 0 },
      });
      assertEqual(result.pickup?.fragmentSlot, 1, 'fixed tile 6 should recover Concord slot 1');
      assertEqual(result.pickup?.reason, 'natural_landing', 'exact landing remains the natural path');
      assertEqual(result.state.rollsSinceFragment, 0, 'pickup resets the dry-spell counter');
    },
  },
  {
    name: 'soft pity recovers a crossed fragment on the seventh miss without altering movement',
    run: () => {
      const result = resolveConcordRollProtection({
        islandNumber: 1,
        tileCount: 36,
        landingTileIndex: 8,
        hopSequence: [5, 6, 7, 8],
        collectedSlots: [],
        state: { rollsTaken: 6, rollsSinceFragment: CONCORD_SOFT_PITY_MISS_ROLLS - 1 },
      });
      assertEqual(result.pickup?.tileIndex, 6, 'crossed fixed fragment should answer the resonance');
      assertEqual(result.pickup?.reason, 'resonance_crossing', 'assist must be visibly identified');
      assertEqual(result.state.rollsTaken, 7, 'eligible roll counter advances once');
    },
  },
  {
    name: 'hard pity locks the nearest forward remaining signal after ten misses',
    run: () => {
      const result = resolveConcordRollProtection({
        islandNumber: 1,
        tileCount: 36,
        landingTileIndex: 18,
        hopSequence: [15, 16, 17, 18],
        collectedSlots: [4],
        state: { rollsTaken: 8, rollsSinceFragment: 9 },
      });
      assertEqual(result.pickup?.tileIndex, 21, 'nearest forward uncollected signal should be chosen');
      assertEqual(result.pickup?.reason, 'signal_lock', 'hard protection has an explicit presentation reason');
    },
  },
  {
    name: 'minimum-progress schedule guarantees all nine fragments by roll 55',
    run: () => {
      let state = { rollsTaken: 0, rollsSinceFragment: 0 };
      const collected: number[] = [];
      for (let roll = 1; roll <= CONCORD_COMPLETION_ROLL_CAP; roll += 1) {
        const result = resolveConcordRollProtection({
          islandNumber: 1,
          tileCount: 36,
          landingTileIndex: 4,
          hopSequence: [],
          collectedSlots: collected,
          state,
        });
        state = result.state;
        if (result.pickup) collected.push(result.pickup.fragmentSlot);
      }
      assertEqual(new Set(collected).size, 9, 'worst-case run must complete the Concord by roll 55');
      assertEqual(state.rollsTaken, CONCORD_COMPLETION_ROLL_CAP, 'cap is measured in persisted eligible rolls');
    },
  },
  {
    name: 'existing partial saves resume beside the next checkpoint and inside soft pity',
    run: () => {
      assertDeepEqual(
        resolveInitialConcordRollProtectionState([0, 2, 4, 6]),
        { rollsTaken: 28, rollsSinceFragment: 6 },
        'four-piece existing run should not restart its pacing counters',
      );
      assertDeepEqual(
        resolveInitialConcordRollProtectionState([]),
        { rollsTaken: 0, rollsSinceFragment: 0 },
        'brand-new run starts without artificial pressure',
      );
    },
  },
  {
    name: 'cross-device conflict merge keeps furthest progress and pickup resets',
    run: () => {
      assertDeepEqual(
        mergeConcordRollProtectionState(
          { rollsTaken: 20, rollsSinceFragment: 5 },
          { rollsTaken: 22, rollsSinceFragment: 2 },
        ),
        { rollsTaken: 22, rollsSinceFragment: 2 },
        'furthest roll progress wins',
      );
      assertDeepEqual(
        mergeConcordRollProtectionState(
          { rollsTaken: 22, rollsSinceFragment: 4 },
          { rollsTaken: 22, rollsSinceFragment: 0 },
        ),
        { rollsTaken: 22, rollsSinceFragment: 0 },
        'same-roll pickup reset wins over stale miss count',
      );
    },
  },
];
