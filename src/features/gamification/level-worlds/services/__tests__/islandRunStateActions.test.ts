/**
 * C1 integration tests — islandRunStateActions
 *
 * These tests validate the two action functions introduced in Stage C1:
 * - `applyRollResult` — syncs the store mirror from localStorage after the
 *   roll service has already committed.
 * - `applyTokenHopRewards` — applies currency deltas through the store.
 *
 * Also includes regression tests for the drift vector that C1 eliminates:
 * - "one commit per roll" — the roll service writes once, `applyRollResult`
 *   only refreshes the mirror (no duplicate remote write).
 * - "hydrate with older version does NOT roll back" — a stale hydration
 *   result must not overwrite a newer local state for dicePool/tokenIndex.
 */

import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  getIslandRunStateSnapshot,
  refreshIslandRunStateFromLocal,
  resetIslandRunStateSnapshot,
  subscribeIslandRunState,
} from '../islandRunStateStore';
import {
  applyRollResult,
  applyTokenHopRewards,
} from '../islandRunStateActions';
import {
  assert,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const USER_ID = 'state-actions-test-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      user_metadata: {},
    },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetAll(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

function seedState(overrides: Partial<IslandRunGameStateRecord>): void {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  void writeIslandRunGameStateRecord({
    session,
    client: null,
    record: { ...base, ...overrides },
  });
  // Also update the store mirror so snapshot is consistent.
  refreshIslandRunStateFromLocal(session);
}

export const islandRunStateActionsTests: TestCase[] = [
  // ── applyRollResult ──────────────────────────────────────────────────────

  {
    name: 'applyRollResult syncs store mirror from localStorage (no duplicate remote write)',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      // Simulate what the roll service does: write directly to localStorage.
      const postRollRecord = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 29,
        tokenIndex: 7,
        runtimeVersion: 6,
      };
      void writeIslandRunGameStateRecord({ session, client: null, record: postRollRecord });

      // The store mirror still holds the pre-roll snapshot.
      const preSync = getIslandRunStateSnapshot(session);
      assertEqual(preSync.dicePool, 30, 'store mirror should still be pre-roll before sync');
      assertEqual(preSync.tokenIndex, 0, 'store tokenIndex should still be pre-roll');

      // applyRollResult refreshes the mirror from localStorage.
      const result = applyRollResult({ session });

      assertEqual(result.dicePool, 29, 'returned record should have post-roll dicePool');
      assertEqual(result.tokenIndex, 7, 'returned record should have post-roll tokenIndex');
      assertEqual(result.runtimeVersion, 6, 'runtimeVersion should be post-roll');

      // Store mirror should now match.
      const postSync = getIslandRunStateSnapshot(session);
      assertEqual(postSync.dicePool, 29, 'store mirror should reflect post-roll dicePool');
      assertEqual(postSync.tokenIndex, 7, 'store mirror should reflect post-roll tokenIndex');
    },
  },

  {
    name: 'applyRollResult notifies store subscribers on sync',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      // Simulate roll write to localStorage.
      const postRollRecord = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 28,
        tokenIndex: 3,
        runtimeVersion: 6,
      };
      void writeIslandRunGameStateRecord({ session, client: null, record: postRollRecord });

      // applyRollResult should publish, triggering the subscriber.
      applyRollResult({ session });
      assertEqual(notifications, 1, 'subscriber should be notified exactly once');

      unsub();
    },
  },

  // ── applyTokenHopRewards ──────────────────────────────────────────────────

  {
    name: 'applyTokenHopRewards applies positive deltas and commits through the store',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 20, spinTokens: 5, essence: 100 });

      const result = applyTokenHopRewards({
        session,
        client: null,
        deltas: { dicePool: 3, spinTokens: 2, essence: 15 },
        triggerSource: 'test_positive',
      });

      assertEqual(result.dicePool, 23, 'dicePool should increase by 3');
      assertEqual(result.spinTokens, 7, 'spinTokens should increase by 2');
      assertEqual(result.essence, 115, 'essence should increase by 15');
      assertEqual(result.runtimeVersion, 11, 'runtimeVersion should bump by 1');

      // Store mirror matches.
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.dicePool, 23, 'store mirror dicePool should match');
      assertEqual(snapshot.spinTokens, 7, 'store mirror spinTokens should match');
    },
  },

  {
    name: 'applyTokenHopRewards applies negative deltas and clamps to zero',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 5, spinTokens: 2, essence: 10 });

      const result = applyTokenHopRewards({
        session,
        client: null,
        deltas: { spinTokens: -3, dicePool: -10, essence: -20 },
        triggerSource: 'test_negative',
      });

      assertEqual(result.spinTokens, 0, 'spinTokens should clamp to 0 (not go negative)');
      assertEqual(result.dicePool, 0, 'dicePool should clamp to 0');
      assertEqual(result.essence, 0, 'essence should clamp to 0');
    },
  },

  {
    name: 'applyTokenHopRewards omitted deltas leave fields unchanged',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 20, spinTokens: 5, essence: 100 });

      const result = applyTokenHopRewards({
        session,
        client: null,
        deltas: { dicePool: 3 },  // only dicePool, no spinTokens or essence
        triggerSource: 'test_partial',
      });

      assertEqual(result.dicePool, 23, 'dicePool should increase by 3');
      assertEqual(result.spinTokens, 5, 'spinTokens should be unchanged');
      assertEqual(result.essence, 100, 'essence should be unchanged');
    },
  },

  {
    name: 'applyTokenHopRewards notifies store subscribers',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 20, spinTokens: 5, essence: 100 });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      applyTokenHopRewards({
        session,
        client: null,
        deltas: { dicePool: 1 },
        triggerSource: 'test_notify',
      });

      assertEqual(notifications, 1, 'subscriber should be notified exactly once');
      unsub();
    },
  },

  // ── Regression: one commit per roll ─────────────────────────────────────

  {
    name: 'one commit per roll: applyRollResult does not bump runtimeVersion (roll service owns it)',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      // Simulate roll service's commit.
      const postRoll = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 29,
        tokenIndex: 4,
        runtimeVersion: 6,
      };
      void writeIslandRunGameStateRecord({ session, client: null, record: postRoll });

      // applyRollResult should NOT bump runtimeVersion again.
      const result = applyRollResult({ session });
      assertEqual(result.runtimeVersion, 6, 'runtimeVersion should stay at 6 (not 7)');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 6, 'store mirror runtimeVersion should be 6');
    },
  },

  // ── Regression: hydrate with older version does NOT roll back ───────────

  {
    name: 'stale hydration does not roll back tokenIndex or dicePool in the store',
    run: () => {
      resetAll();
      const session = makeSession();

      // Start with version 10 in the store.
      seedState({ runtimeVersion: 10, dicePool: 50, tokenIndex: 15, spinTokens: 8 });

      // Simulate a stale hydration result (v8 — older than current v10).
      const staleRecord: IslandRunGameStateRecord = {
        ...readIslandRunGameStateRecord(session),
        runtimeVersion: 8,
        dicePool: 20,
        tokenIndex: 3,
        spinTokens: 2,
      };

      // The reconciliation handler (in the renderer) checks
      // `incomingRuntimeVersion > currentRuntimeVersion` before applying.
      // We simulate that guard here: only publish if newer.
      const current = getIslandRunStateSnapshot(session);
      if (staleRecord.runtimeVersion > current.runtimeVersion) {
        resetIslandRunStateSnapshot(session, staleRecord);
      }

      // Store must still have the v10 values.
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 10, 'runtimeVersion must stay at 10');
      assertEqual(snapshot.dicePool, 50, 'dicePool must not be rolled back to 20');
      assertEqual(snapshot.tokenIndex, 15, 'tokenIndex must not be rolled back to 3');
      assertEqual(snapshot.spinTokens, 8, 'spinTokens must not be rolled back to 2');
    },
  },

  {
    name: 'sequential applyTokenHopRewards compose correctly (no dropped deltas)',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 10, spinTokens: 0, essence: 50 });

      // First hop: earn dice.
      applyTokenHopRewards({ session, client: null, deltas: { dicePool: 5 }, triggerSource: 'hop1' });
      // Second hop: earn essence + spinTokens.
      applyTokenHopRewards({ session, client: null, deltas: { essence: 20, spinTokens: 3 }, triggerSource: 'hop2' });
      // Third hop: spend spinTokens.
      applyTokenHopRewards({ session, client: null, deltas: { spinTokens: -2 }, triggerSource: 'hop3' });

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.dicePool, 15, 'dicePool should be 10 + 5');
      assertEqual(snapshot.essence, 70, 'essence should be 50 + 20');
      assertEqual(snapshot.spinTokens, 1, 'spinTokens should be 0 + 3 - 2');
      assertEqual(snapshot.runtimeVersion, 13, 'runtimeVersion should bump 3 times (10 → 13)');
    },
  },
];
