/**
 * Persistence coverage for the 3×3 tech-collection ledgers.
 *
 * Verifies the feature reuses the EXISTING canonical ledgers
 * (`techCollectionByIsland` / `techCollectionRewardedLinesByIsland`, persisted
 * by migration 0264) — no new SQL column is required:
 *   - the canonical action normalizes + commits collected slots and rewarded lines,
 *   - the ledgers survive a localStorage serialize → read round-trip (sanitize),
 *   - a fresh-run reset clears both ledgers.
 */

import {
  __resetIslandRunStateStoreForTests,
  getIslandRunStateSnapshot,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { buildFreshIslandRunRecord } from '../islandRunProgressReset';
import { applyTechCollectionState } from '../islandRunStateActions';
import {
  assert,
  assertDeepEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const USER_ID = 'tech-collection-persistence-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: USER_ID, user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetAll(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

export const islandRunTechCollectionPersistenceTests: TestCase[] = [
  {
    name: 'canonical action normalizes and persists collected slots + rewarded lines',
    run: () => {
      resetAll();
      const session = makeSession();
      const next = applyTechCollectionState({
        session,
        client: null,
        islandNumber: 1,
        // Deliberately unsorted, duplicated, and out-of-range to prove normalization.
        collectedSlots: [4, 0, 4, 2, 99, -1],
        rewardedLines: [3, 3, 0, 42],
      });
      assertDeepEqual(next.techCollectionByIsland['1'], [0, 2, 4], 'collected slots sorted + deduped + clamped 0-8');
      assertDeepEqual(next.techCollectionRewardedLinesByIsland['1'], [0, 3], 'rewarded lines sorted + deduped + clamped 0-7');
      const snapshot = getIslandRunStateSnapshot(session);
      assertDeepEqual(snapshot.techCollectionByIsland['1'], [0, 2, 4], 'store mirror reflects collected slots');
    },
  },
  {
    name: 'ledgers survive a localStorage serialize → read round-trip',
    run: () => {
      resetAll();
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      void writeIslandRunGameStateRecord({
        session,
        client: null,
        record: {
          ...base,
          techCollectionByIsland: { '1': [0, 1, 2, 8], '2': [5] },
          techCollectionRewardedLinesByIsland: { '1': [0, 6] },
        },
      });
      const reread = readIslandRunGameStateRecord(session);
      assertDeepEqual(reread.techCollectionByIsland['1'], [0, 1, 2, 8], 'island 1 collected slots persisted');
      assertDeepEqual(reread.techCollectionByIsland['2'], [5], 'island 2 collected slots persisted');
      assertDeepEqual(reread.techCollectionRewardedLinesByIsland['1'], [0, 6], 'rewarded lines persisted');
    },
  },
  {
    name: 'is per-island and additive across islands',
    run: () => {
      resetAll();
      const session = makeSession();
      applyTechCollectionState({ session, client: null, islandNumber: 1, collectedSlots: [0], rewardedLines: [] });
      const next = applyTechCollectionState({ session, client: null, islandNumber: 2, collectedSlots: [3, 4], rewardedLines: [] });
      assertDeepEqual(next.techCollectionByIsland['1'], [0], 'island 1 ledger preserved');
      assertDeepEqual(next.techCollectionByIsland['2'], [3, 4], 'island 2 ledger added independently');
    },
  },
  {
    name: 'clearing an island removes its ledger key entirely',
    run: () => {
      resetAll();
      const session = makeSession();
      applyTechCollectionState({ session, client: null, islandNumber: 1, collectedSlots: [0, 1], rewardedLines: [0] });
      const cleared = applyTechCollectionState({ session, client: null, islandNumber: 1, collectedSlots: [], rewardedLines: [] });
      assert(!('1' in cleared.techCollectionByIsland), 'collected key dropped when empty');
      assert(!('1' in cleared.techCollectionRewardedLinesByIsland), 'rewarded key dropped when empty');
    },
  },
  {
    name: 'a fresh-run reset clears both tech ledgers',
    run: () => {
      resetAll();
      const session = makeSession();
      applyTechCollectionState({ session, client: null, islandNumber: 1, collectedSlots: [0, 1, 2], rewardedLines: [0] });
      const fresh = buildFreshIslandRunRecord(readIslandRunGameStateRecord(session));
      void writeIslandRunGameStateRecord({ session, client: null, record: fresh });
      refreshIslandRunStateFromLocal(session);
      const snapshot = getIslandRunStateSnapshot(session);
      assertDeepEqual(snapshot.techCollectionByIsland, {}, 'collected ledger reset to empty');
      assertDeepEqual(snapshot.techCollectionRewardedLinesByIsland, {}, 'rewarded ledger reset to empty');
    },
  },
];
