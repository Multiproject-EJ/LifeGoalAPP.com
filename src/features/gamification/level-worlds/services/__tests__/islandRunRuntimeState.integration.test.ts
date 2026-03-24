import { hydrateIslandRunGameStateRecordWithSource, readIslandRunGameStateRecord, writeIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { persistIslandRunRuntimeStatePatch, readIslandRunRuntimeState } from '../islandRunRuntimeState';
import { assert, assertDeepEqual, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'runtime-test-user';

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

function resetStorage(initial: Record<string, string> = {}): void {
  installWindowWithStorage(createMemoryStorage(initial));
}

function createAlwaysSuccessfulRuntimeClient() {
  let updateCalls = 0;
  const client = {
    from() {
      return {
        update() {
          updateCalls += 1;
          return {
            eq() {
              return this;
            },
            select() {
              return this;
            },
            maybeSingle: async () => ({ data: { runtime_version: updateCalls }, error: null }),
          };
        },
        insert: async () => ({ error: null }),
        select() {
          return {
            eq() {
              return this;
            },
            maybeSingle: async () => ({ data: { user_id: USER_ID }, error: null }),
          };
        },
      };
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return {
    client,
    getUpdateCalls: () => updateCalls,
  };
}

export const islandRunRuntimeStateIntegrationTests: TestCase[] = [
  {
    name: 'hydrateIslandRunGameStateRecordWithSource falls back to local state when client is missing',
    run: async () => {
      resetStorage({
        [`island_run_runtime_state_${USER_ID}`]: JSON.stringify({
          currentIslandNumber: 4,
          bossTrialResolvedIslandNumber: 3,
          shards: 7,
        }),
      });
      const result = await hydrateIslandRunGameStateRecordWithSource({
        session: makeSession(),
        client: null,
      });
      assertEqual(result.source, 'fallback_demo_or_no_client', 'Expected no-client hydration fallback source');
      assertEqual(result.record.currentIslandNumber, 4, 'Expected local current island to be restored');
      assertEqual(result.record.bossTrialResolvedIslandNumber, 3, 'Expected local boss marker to be restored');
      assertEqual(result.record.shards, 7, 'Expected local shards to be restored');
    },
  },
  {
    name: 'persistIslandRunRuntimeStatePatch merges ledger and stop state while sanitizing numeric values',
    run: async () => {
      resetStorage({
        [`island_run_runtime_state_${USER_ID}`]: JSON.stringify({
          currentIslandNumber: 2,
          cycleIndex: 1,
          perIslandEggs: {
            '2': { tier: 'common', setAtMs: 100, hatchAtMs: 200, status: 'ready', location: 'island' },
          },
          completedStopsByIsland: {
            '2': ['hatchery'],
          },
          tokenIndex: 4,
          hearts: 3,
          coins: 12,
          spinTokens: 1,
          dicePool: 6,
          shields: 1,
          shards: 2,
        }),
      });

      const persistResult = await persistIslandRunRuntimeStatePatch({
        session: makeSession(),
        client: null,
        patch: {
          currentIslandNumber: 5.8,
          cycleIndex: -3,
          perIslandEggs: {
            '5': { tier: 'rare', setAtMs: 500, hatchAtMs: 900, status: 'incubating', location: 'island' },
          },
          completedStopsByIsland: {
            '5': ['boss', 123 as unknown as string],
          },
          tokenIndex: 8.7,
          hearts: -2,
          coins: 41.6,
          spinTokens: 2.2,
          dicePool: 13.9,
          shields: -4,
          shards: 9.9,
        },
      });

      assertDeepEqual(persistResult, { ok: true }, 'Expected local-only persistence to succeed');

      const state = readIslandRunRuntimeState(makeSession());
      assertEqual(state.currentIslandNumber, 5, 'Expected island number to be floored to a positive integer');
      assertEqual(state.cycleIndex, 0, 'Expected cycle index to clamp at zero');
      assertEqual(state.tokenIndex, 8, 'Expected token index to floor to a non-negative integer');
      assertEqual(state.hearts, 0, 'Expected hearts to clamp at zero');
      assertEqual(state.coins, 41, 'Expected coins to be floored');
      assertEqual(state.spinTokens, 2, 'Expected spin tokens to be floored');
      assertEqual(state.dicePool, 13, 'Expected dice pool to be floored');
      assertEqual(state.shields, 0, 'Expected shields to clamp at zero');
      assertEqual(state.shards, 9, 'Expected shards to be floored');
      assertDeepEqual(Object.keys(state.perIslandEggs).sort(), ['2', '5'], 'Expected egg ledger merge to preserve old and new islands');
      assertDeepEqual(state.completedStopsByIsland, {
        '2': ['hatchery'],
        '5': ['boss'],
      }, 'Expected completed stops merge to filter invalid entries');
    },
  },
  {
    name: 'writeIslandRunGameStateRecord queues pending write when remote is unavailable',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      const result = await writeIslandRunGameStateRecord({
        session,
        client: null,
        record: {
          ...baseline,
          hearts: baseline.hearts + 1,
        },
      });

      assertDeepEqual(result, { ok: true }, 'Expected write to succeed in queued local mode');
      const pendingRaw = window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`);
      assert(typeof pendingRaw === 'string' && pendingRaw.length > 0, 'Expected pending write payload to be queued');
    },
  },
  {
    name: 'writeIslandRunGameStateRecord replays queued write before current write when remote recovers',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      window.localStorage.setItem(
        `island_run_runtime_state_${USER_ID}_pending_write`,
        JSON.stringify({
          ...baseline,
          hearts: baseline.hearts + 2,
        }),
      );
      const { client, getUpdateCalls } = createAlwaysSuccessfulRuntimeClient();
      const result = await writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          hearts: baseline.hearts + 3,
        },
      });

      assertDeepEqual(result, { ok: true }, 'Expected replay + current write to succeed');
      assert(getUpdateCalls() >= 2, 'Expected pending replay write plus current write');
      assertEqual(
        window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`),
        null,
        'Expected pending write queue to be cleared after successful replay',
      );
    },
  },
];
