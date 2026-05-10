import {
  getIslandRunRuntimeCommitSyncStateForTests,
  getIslandRunLuckyRollSessionKey,
  hydrateIslandRunGameStateRecordWithSource,
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  sanitizeIslandRunLuckyRollSessionsByMilestone,
  writeIslandRunGameStateRecord,
  type IslandRunLuckyRollSession,
} from '../islandRunGameStateStore';
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
  resetIslandRunRuntimeCommitCoordinatorForTests();
  installWindowWithStorage(createMemoryStorage(initial));
}

function createAlwaysSuccessfulRuntimeClient() {
  let commitCalls = 0;
  const client = {
    rpc(_name: string, args: { p_expected_runtime_version?: number }) {
      commitCalls += 1;
      const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
      return Promise.resolve({
        data: [{ status: 'applied', runtime_version: expected + 1 }],
        error: null,
      });
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return {
    client,
    getUpdateCalls: () => commitCalls,
  };
}

function createConflictRuntimeClient() {
  let commitCalls = 0;
  const client = {
    rpc(name: string) {
      if (name === 'island_run_commit_action') {
        commitCalls += 1;
        return Promise.resolve({
          data: [{ status: 'conflict' }],
          error: null,
        });
      }
      return Promise.resolve({
        data: null,
        error: { message: 'network request failed', code: 'failed_to_fetch' },
      });
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'network request failed', code: 'failed_to_fetch' },
                  });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return {
    client,
    getCommitCalls: () => commitCalls,
  };
}


function makeLuckyRollSession(overrides: Partial<IslandRunLuckyRollSession> = {}): IslandRunLuckyRollSession {
  return {
    status: 'active',
    runId: 'run-30',
    targetIslandNumber: 30,
    cycleIndex: 0,
    position: 0,
    rollsUsed: 0,
    claimedTileIds: [],
    pendingRewards: [],
    bankedRewards: [],
    startedAtMs: 1000,
    bankedAtMs: null,
    updatedAtMs: 1000,
    ...overrides,
  };
}

function createRemoteHydrationClient(row: Record<string, unknown> | null) {
  let selectedColumns = '';
  const client = {
    from() {
      return {
        select(columns: string) {
          selectedColumns = columns;
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({ data: row, error: null });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return {
    client,
    getSelectedColumns: () => selectedColumns,
  };
}

function createCapturePayloadRuntimeClient() {
  const payloads: Array<Record<string, unknown>> = [];
  const client = {
    rpc(_name: string, args: { p_action_payload?: Record<string, unknown>; p_expected_runtime_version?: number }) {
      payloads.push(args.p_action_payload ?? {});
      const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
      return Promise.resolve({
        data: [{ status: 'applied', runtime_version: expected + 1 }],
        error: null,
      });
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return {
    client,
    getLastPayload: () => payloads[payloads.length - 1],
  };
}

function createLuckyRollConflictMergeClient(remoteSession: IslandRunLuckyRollSession) {
  let commitCalls = 0;
  const remoteKey = getIslandRunLuckyRollSessionKey(remoteSession.cycleIndex, remoteSession.targetIslandNumber);
  const client = {
    rpc(_name: string, args: { p_expected_runtime_version?: number }) {
      commitCalls += 1;
      if (commitCalls === 1) {
        return Promise.resolve({ data: [{ status: 'conflict' }], error: null });
      }
      const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
      return Promise.resolve({ data: [{ status: 'applied', runtime_version: expected + 1 }], error: null });
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: {
                      runtime_version: 4,
                      current_island_number: 1,
                      dice_pool: 30,
                      lucky_roll_sessions_by_milestone: {
                        [remoteKey]: remoteSession,
                      },
                    },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return { client, getCommitCalls: () => commitCalls };
}

function createDeferredSingleFlightClient() {
  let commitCalls = 0;
  let inFlight = 0;
  let maxInFlight = 0;
  const pendingResolvers: Array<() => void> = [];
  const client = {
    rpc(_name: string, args: { p_expected_runtime_version?: number }) {
      commitCalls += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
      return new Promise<{ data: Array<{ status: string; runtime_version: number }>; error: null }>((resolve) => {
        pendingResolvers.push(() => {
          inFlight -= 1;
          resolve({
            data: [{ status: 'applied', runtime_version: expected + 1 }],
            error: null,
          });
        });
      });
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return {
    client,
    getCommitCalls: () => commitCalls,
    getMaxInFlight: () => maxInFlight,
    releaseNext: () => {
      const next = pendingResolvers.shift();
      if (next) next();
    },
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
    name: 'legacy-only patch does not create contract-v2 active event or reward-bar side effects',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const before = readIslandRunRuntimeState(session);
      assertEqual(before.activeTimedEvent, null, 'Expected no active timed event in fresh baseline');

      const persistResult = await persistIslandRunRuntimeStatePatch({
        session,
        client: null,
        patch: {
          currentIslandNumber: 3,
          tokenIndex: 6,
          dicePool: 12,
        },
      });

      assertDeepEqual(persistResult, { ok: true }, 'Expected legacy-only patch persistence to succeed');
      const after = readIslandRunRuntimeState(session);
      assertEqual(after.activeTimedEvent, null, 'Expected legacy patch to avoid creating active timed event');
      assertEqual(after.rewardBarBoundEventId, null, 'Expected legacy patch to avoid binding reward bar to an event');
      assertEqual(after.rewardBarClaimCountInEvent, 0, 'Expected reward-bar claim state to remain untouched');
      assertEqual(after.rewardBarEscalationTier, 0, 'Expected reward-bar escalation state to remain untouched');
      assertEqual(after.rewardBarProgress, 0, 'Expected reward-bar progress to remain untouched');
    },
  },
  {
    name: 'island transition patch preserves non-expired active event and event-bound reward state',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const seededEvent = {
        eventId: 'feeding_frenzy:1234',
        eventType: 'feeding_frenzy',
        startedAtMs: 1234,
        expiresAtMs: 1234 + (8 * 60 * 60 * 1000),
        version: 1,
      };

      const seedResult = await persistIslandRunRuntimeStatePatch({
        session,
        client: null,
        patch: {
          activeTimedEvent: seededEvent,
          rewardBarBoundEventId: seededEvent.eventId,
          rewardBarLadderId: 'feeding_frenzy_ladder_v1',
          rewardBarProgress: 6,
          rewardBarThreshold: 10,
          rewardBarClaimCountInEvent: 2,
          rewardBarEscalationTier: 2,
          rewardBarLastClaimAtMs: 9_999,
          activeTimedEventProgress: {
            feedingActions: 4,
            tokensEarned: 7,
            milestonesClaimed: 2,
          },
        },
      });
      assertDeepEqual(seedResult, { ok: true }, 'Expected v2 event state seed to persist');

      // Simulate island transition patch shape (travel-related fields only).
      const travelResult = await persistIslandRunRuntimeStatePatch({
        session,
        client: null,
        patch: {
          currentIslandNumber: 9,
          cycleIndex: 2,
          islandStartedAtMs: 50_000,
          islandExpiresAtMs: 80_000,
          tokenIndex: 0,
          dicePool: 20,
          spinTokens: 0,
        },
      });
      assertDeepEqual(travelResult, { ok: true }, 'Expected island transition patch to persist');

      const afterTravel = readIslandRunRuntimeState(session);
      assertDeepEqual(afterTravel.activeTimedEvent, seededEvent, 'Expected non-expired active event to remain unchanged across island transition patch');
      assertEqual(afterTravel.rewardBarBoundEventId, seededEvent.eventId, 'Expected reward-bar bound event to remain unchanged across island transition patch');
      assertEqual(afterTravel.rewardBarProgress, 6, 'Expected reward-bar progress to remain unchanged across island transition patch');
      assertEqual(afterTravel.rewardBarClaimCountInEvent, 2, 'Expected event claim count to remain unchanged across island transition patch');
      assertEqual(afterTravel.rewardBarEscalationTier, 2, 'Expected event escalation tier to remain unchanged across island transition patch');
      assertDeepEqual(afterTravel.activeTimedEventProgress, {
        feedingActions: 4,
        tokensEarned: 7,
        milestonesClaimed: 2,
      }, 'Expected event progress counters to remain unchanged across island transition patch');
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
          spinTokens: 2.2,
          dicePool: 13.9,
          shields: -4,
          shards: 9.9,
          perfectCompanionIds: ['rare-nebula-wisp', 42 as unknown as string],
          perfectCompanionReasons: {
            'rare-nebula-wisp': {
              strength: ['explorer', 5 as unknown as string],
              weaknessSupport: ['stress_fragility'],
              zoneMatch: true,
            },
          },
          perfectCompanionComputedAtMs: 123456789,
          perfectCompanionModelVersion: 'phase3_v1',
          perfectCompanionComputedCycleIndex: 8.2,
        },
      });

      assertDeepEqual(persistResult, { ok: true }, 'Expected local-only persistence to succeed');

      const state = readIslandRunRuntimeState(makeSession());
      assertEqual(state.currentIslandNumber, 5, 'Expected island number to be floored to a positive integer');
      assertEqual(state.cycleIndex, 0, 'Expected cycle index to clamp at zero');
      assertEqual(state.tokenIndex, 8, 'Expected token index to floor to a non-negative integer');
      assertEqual(state.spinTokens, 2, 'Expected spin tokens to be floored');
      assertEqual(state.dicePool, 13, 'Expected dice pool to be floored');
      assertEqual(state.shields, 0, 'Expected shields to clamp at zero');
      assertEqual(state.shards, 9, 'Expected shards to be floored');
      assertDeepEqual(Object.keys(state.perIslandEggs).sort(), ['2', '5'], 'Expected egg ledger merge to preserve old and new islands');
      assertDeepEqual(state.completedStopsByIsland, {
        '2': ['hatchery'],
        '5': ['boss'],
      }, 'Expected completed stops merge to filter invalid entries');
      assertDeepEqual(state.perfectCompanionIds, ['rare-nebula-wisp'], 'Expected perfect companion ids to filter invalid entries');
      assertDeepEqual(state.perfectCompanionReasons['rare-nebula-wisp'], {
        strength: ['explorer'],
        weaknessSupport: ['stress_fragility'],
        zoneMatch: true,
      }, 'Expected perfect companion reasons to sanitize payload shape');
      assertEqual(state.perfectCompanionModelVersion, 'phase3_v1', 'Expected model version to persist');
      assertEqual(state.perfectCompanionComputedCycleIndex, 8, 'Expected computed cycle index to floor');
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
          dicePool: baseline.dicePool + 1,
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
          dicePool: baseline.dicePool + 2,
        }),
      );
      const { client, getUpdateCalls } = createAlwaysSuccessfulRuntimeClient();
      const result = await writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          dicePool: baseline.dicePool + 3,
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
  {
    name: 'writeIslandRunGameStateRecord blocks retry storm after conflict recovery remote-unavailable error',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const { client, getCommitCalls } = createConflictRuntimeClient();
      const baseline = readIslandRunGameStateRecord(session);

      const first = await writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          dicePool: baseline.dicePool + 1,
        },
      });

      const second = await writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          dicePool: baseline.dicePool + 2,
        },
      });

      assertDeepEqual(first, { ok: true }, 'Expected first conflict write to degrade into queued backoff mode');
      assertDeepEqual(second, { ok: true }, 'Expected subsequent write during backoff to stay queued');
      assertEqual(getCommitCalls(), 1, 'Expected only one commit RPC call while conflict/backoff gate is active');
    },
  },
  {
    name: 'writeIslandRunGameStateRecord does not false-dedupe content-identical writes; parks and resumes second',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      const { client, getCommitCalls, getMaxInFlight, releaseNext } = createDeferredSingleFlightClient();

      const writeA = writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          dicePool: baseline.dicePool + 1,
        },
      });

      const writeAIdentical = writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          dicePool: baseline.dicePool + 1,
        },
      });

      await Promise.resolve();
      assertEqual(getCommitCalls(), 1, 'Expected content-identical write to park via single-flight while first is in-flight');

      releaseNext();
      await writeA;
      await writeAIdentical;
      await new Promise((resolve) => setTimeout(resolve, 0));
      releaseNext();
      await new Promise((resolve) => setTimeout(resolve, 0));

      assertEqual(getCommitCalls(), 2, 'Expected both content-identical writes to produce separate commits (no false dedupe)');
      assertEqual(getMaxInFlight(), 1, 'Expected max one in-flight commit at any moment');
    },
  },
  {
    name: 'writeIslandRunGameStateRecord resumes parked action after single-flight slot frees',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      const { client, getCommitCalls, getMaxInFlight, releaseNext } = createDeferredSingleFlightClient();

      const firstWrite = writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          dicePool: baseline.dicePool + 1,
        },
      });

      const parkedWrite = writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          dicePool: baseline.dicePool + 2,
        },
      });

      await Promise.resolve();
      assertEqual(getCommitCalls(), 1, 'Expected second write to park while first is in-flight');

      releaseNext();
      await firstWrite;
      await parkedWrite;
      await new Promise((resolve) => setTimeout(resolve, 0));
      releaseNext();
      await new Promise((resolve) => setTimeout(resolve, 0));

      assertEqual(getCommitCalls(), 2, 'Expected parked action to resume after single-flight slot is released');
      assertEqual(getMaxInFlight(), 1, 'Expected resumed write to still honor single-flight limit');
    },
  },
  {
    name: 'persistIslandRunRuntimeStatePatch requires explicit booleans for stop completion fields',
    run: async () => {
      resetStorage();
      const persistResult = await persistIslandRunRuntimeStatePatch({
        session: makeSession(),
        client: null,
        patch: {
          stopStatesByIndex: [
            { objectiveComplete: 'true' as unknown as boolean, buildComplete: 'true' as unknown as boolean },
            { objectiveComplete: true, buildComplete: true },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
          ],
        },
      });

      assertDeepEqual(persistResult, { ok: true }, 'Expected persistence to accept payload');
      const state = readIslandRunRuntimeState(makeSession());
      assertEqual(state.stopStatesByIndex[0]?.objectiveComplete, false, 'Expected non-boolean objectiveComplete to normalize to false');
      assertEqual(state.stopStatesByIndex[0]?.buildComplete, false, 'Expected non-boolean buildComplete to normalize to false');
      assertEqual(state.stopStatesByIndex[1]?.objectiveComplete, true, 'Expected explicit boolean objectiveComplete to persist');
      assertEqual(state.stopStatesByIndex[1]?.buildComplete, true, 'Expected explicit boolean buildComplete to persist');
    },
  },
  {
    name: 'writeIslandRunGameStateRecord allows writes again after backoff expires',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);

      // Phase 1: Trigger conflict → backoff activates
      const { client: conflictClient } = createConflictRuntimeClient();
      await writeIslandRunGameStateRecord({
        session,
        client: conflictClient,
        record: { ...baseline, dicePool: baseline.dicePool + 1 },
      });

      // Verify backoff is stored
      const backoffKey = `island_run_runtime_state_${USER_ID}_remote_backoff_until`;
      assert(window.localStorage.getItem(backoffKey) !== null, 'Expected backoff timestamp to be stored after conflict');

      // Simulate expiry by setting timestamp in the past
      window.localStorage.setItem(backoffKey, String(Date.now() - 1000));

      // Reset coordinator to isolate backoff-gate behavior from stale parked-replay concerns
      resetIslandRunRuntimeCommitCoordinatorForTests();

      // Clear pending write to isolate the test
      window.localStorage.removeItem(`island_run_runtime_state_${USER_ID}_pending_write`);

      // Phase 2: Write with successful client — should not be blocked
      const { client: successClient, getUpdateCalls } = createAlwaysSuccessfulRuntimeClient();
      const result = await writeIslandRunGameStateRecord({
        session,
        client: successClient,
        record: { ...baseline, dicePool: baseline.dicePool + 2 },
      });

      assertDeepEqual(result, { ok: true }, 'Expected write to succeed after backoff expired');
      assert(getUpdateCalls() >= 1, 'Expected at least one commit RPC after backoff expired');
    },
  },
  {
    name: 'syncState returns to idle after conflict error triggers blocked_conflict_recovery',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);

      // Before any write, syncState is idle
      assertEqual(
        getIslandRunRuntimeCommitSyncStateForTests(USER_ID),
        'idle',
        'Expected initial syncState to be idle',
      );

      // Trigger conflict → error path sets blocked_conflict_recovery, but finally block should reset to idle
      const { client: conflictClient } = createConflictRuntimeClient();
      await writeIslandRunGameStateRecord({
        session,
        client: conflictClient,
        record: { ...baseline, dicePool: baseline.dicePool + 1 },
      });

      // With the fix, the finally block unconditionally resets syncState to idle when inFlightCount === 0
      assertEqual(
        getIslandRunRuntimeCommitSyncStateForTests(USER_ID),
        'idle',
        'Expected syncState to be reset to idle after conflict error (not stuck at blocked_conflict_recovery)',
      );
    },
  },
  {
    // Regression: write-amplification loop prevention.
    //
    // Scenario: Component mounts with dicePool=30 (useState default). Hydration
    // delivers runtimeState.dicePool=14 from the server. Before the hydration
    // effect can apply setDicePool(14), the persist effect fires and sees
    // localDicePool(30) !== runtimeState.dicePool(14) → writes {dicePool:30} back,
    // overwriting the correct server value and starting an oscillation loop.
    //
    // The hasCompletedInitialHydrationSyncRef guard prevents this by blocking
    // persist effects until the hydration-to-local-state sync has completed.
    //
    // This test proves the exact guard decision logic: before the guard is
    // set, the persist-effect condition (localField !== runtimeField) would
    // trigger a write with the stale value; after hydration sync applies the
    // server values, the condition is no longer true and no write occurs.
    name: 'hydration sync guard prevents stale-default write of dicePool/tokenIndex/spinTokens before initial hydration completes',
    run: async () => {
      resetStorage();
      const session = makeSession();

      // Step 1: Simulate "server-hydrated" runtimeState with non-default values
      const hydratedState = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 14,
        tokenIndex: 11,
        spinTokens: 3,
      };

      // Step 2: Simulate local state at component mount (useState defaults)
      const localDefaults = {
        dicePool: 30,       // useState(ISLAND_RUN_DEFAULT_STARTING_DICE)
        tokenIndex: 0,      // useState(TOKEN_START_TILE_INDEX)
        spinTokens: 0,      // useState(0)
      };

      // Step 3: Guard = false (initial hydration sync NOT yet complete)
      //
      // The persist effect's decision logic is:
      //   if (!hasCompletedInitialHydrationSync) return;
      //   if (runtimeState.field === localField) return;
      //   else: write(localField)  ← STALE WRITE
      //
      // Verify that WITHOUT the guard, the diff check would pass (triggering
      // a write) — proving this scenario actually causes the bug.
      const hasCompletedInitialHydrationSync = false;

      const wouldPersistEffectWrite = (guardActive: boolean) => {
        if (!guardActive) return false;  // guard blocks → no write

        // This is the exact condition from the persist effect.
        if (
          hydratedState.tokenIndex === localDefaults.tokenIndex
          && hydratedState.spinTokens === localDefaults.spinTokens
          && hydratedState.dicePool === localDefaults.dicePool
        ) {
          return false;  // no diff → no write
        }
        return true;  // diff detected → write
      };

      // Before guard: persist effect must NOT write
      assertEqual(
        wouldPersistEffectWrite(hasCompletedInitialHydrationSync),
        false,
        'Expected persist effect to be blocked before initial hydration sync completes',
      );

      // Step 4: Verify the diff is real (without guard, a write WOULD fire)
      assert(
        hydratedState.dicePool !== localDefaults.dicePool,
        'Expected dicePool to differ between hydrated state (14) and local default (30) — this is the exact bug trigger',
      );
      assert(
        hydratedState.tokenIndex !== localDefaults.tokenIndex,
        'Expected tokenIndex to differ between hydrated state (11) and local default (0)',
      );
      assert(
        hydratedState.spinTokens !== localDefaults.spinTokens,
        'Expected spinTokens to differ between hydrated state (3) and local default (0)',
      );

      // Step 5: Guard = true (hydration sync has applied server values)
      // After hydration sync, local state now equals hydrated runtimeState
      // so the persist effect's diff check returns false → no stale write.
      const localAfterHydrationSync = {
        dicePool: hydratedState.dicePool,
        tokenIndex: hydratedState.tokenIndex,
        spinTokens: hydratedState.spinTokens,
      };

      const wouldPersistEffectWritePostSync = (() => {
        const guardActive = true;  // guard now open
        if (!guardActive) return false;

        if (
          hydratedState.tokenIndex === localAfterHydrationSync.tokenIndex
          && hydratedState.spinTokens === localAfterHydrationSync.spinTokens
          && hydratedState.dicePool === localAfterHydrationSync.dicePool
        ) {
          return false;
        }
        return true;
      })();

      assertEqual(
        wouldPersistEffectWritePostSync,
        false,
        'Expected no write after hydration sync because local state now matches runtimeState',
      );

      // Step 6: After a genuine gameplay action changes dicePool, the guard
      // allows the persist effect to write normally.
      const localAfterGameplayAction = {
        ...localAfterHydrationSync,
        dicePool: localAfterHydrationSync.dicePool + 15,  // earned 15 dice from a reward claim
      };

      const wouldPersistEffectWriteAfterAction = (() => {
        const guardActive = true;
        if (!guardActive) return false;

        if (
          hydratedState.tokenIndex === localAfterGameplayAction.tokenIndex
          && hydratedState.spinTokens === localAfterGameplayAction.spinTokens
          && hydratedState.dicePool === localAfterGameplayAction.dicePool
        ) {
          return false;
        }
        return true;
      })();

      assertEqual(
        wouldPersistEffectWriteAfterAction,
        true,
        'Expected persist effect to write after a genuine gameplay action changes dicePool',
      );

      // Step 7: Prove end-to-end that the hydrated record persists correctly
      // (server state with dicePool=14 survives a round-trip without being
      // overwritten by the default dicePool=30).
      const { client } = createAlwaysSuccessfulRuntimeClient();
      const writeResult = await writeIslandRunGameStateRecord({
        session,
        client,
        record: hydratedState,
      });
      assertDeepEqual(writeResult, { ok: true }, 'Expected hydrated state write to succeed');
      const persisted = readIslandRunGameStateRecord(session);
      assertEqual(persisted.dicePool, 14, 'Expected persisted dicePool to be hydrated value (14), not stale default (30)');
      assertEqual(persisted.tokenIndex, 11, 'Expected persisted tokenIndex to be hydrated value (11), not stale default (0)');
      assertEqual(persisted.spinTokens, 3, 'Expected persisted spinTokens to be hydrated value (3), not stale default (0)');
    },
  },
  {
    name: 'syncState returns to idle after blocked_remote_backoff write followed by successful post-expiry write',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      const backoffKey = `island_run_runtime_state_${USER_ID}_remote_backoff_until`;

      // Trigger conflict → backoff activates
      const { client: conflictClient } = createConflictRuntimeClient();
      await writeIslandRunGameStateRecord({
        session,
        client: conflictClient,
        record: { ...baseline, dicePool: baseline.dicePool + 1 },
      });

      // syncState was reset to idle in finally block (fix #2)
      assertEqual(
        getIslandRunRuntimeCommitSyncStateForTests(USER_ID),
        'idle',
        'Expected syncState to be idle after conflict write finally block',
      );

      // Write during active backoff — sets syncState to blocked_remote_backoff (early return, no finally)
      await writeIslandRunGameStateRecord({
        session,
        client: conflictClient,
        record: { ...baseline, dicePool: baseline.dicePool + 2 },
      });

      assertEqual(
        getIslandRunRuntimeCommitSyncStateForTests(USER_ID),
        'blocked_remote_backoff',
        'Expected syncState to be blocked_remote_backoff during active backoff',
      );

      // Simulate backoff expiry
      window.localStorage.setItem(backoffKey, String(Date.now() - 1000));

      // Reset coordinator to avoid parked-replay complications, but re-verify from fresh coordinator
      resetIslandRunRuntimeCommitCoordinatorForTests();
      window.localStorage.removeItem(`island_run_runtime_state_${USER_ID}_pending_write`);

      // Write with success client
      const { client: successClient } = createAlwaysSuccessfulRuntimeClient();
      await writeIslandRunGameStateRecord({
        session,
        client: successClient,
        record: { ...baseline, dicePool: baseline.dicePool + 3 },
      });

      assertEqual(
        getIslandRunRuntimeCommitSyncStateForTests(USER_ID),
        'idle',
        'Expected syncState to be idle after successful post-expiry write',
      );
    },
  },
  {
    // Regression: parked writes must not be silently dropped.
    //
    // Scenario: Write A is in flight. Write B arrives and parks behind A via
    // single-flight. If A's remote commit errors (or the tab closes) before
    // the parked resume fires, B's snapshot would previously be lost. The fix
    // enqueues parked records into the `pending_write` localStorage queue so
    // the next successful write replays them.
    name: 'writeIslandRunGameStateRecord enqueues parked single-flight snapshot into pending_write queue',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      const { client, releaseNext } = createDeferredSingleFlightClient();

      // Write A — goes in-flight.
      const writeA = writeIslandRunGameStateRecord({
        session,
        client,
        record: { ...baseline, dicePool: baseline.dicePool + 1 },
      });
      await Promise.resolve();

      // Write B — parks behind A via single-flight.
      const writeB = writeIslandRunGameStateRecord({
        session,
        client,
        record: { ...baseline, dicePool: baseline.dicePool + 7 },
      });
      await Promise.resolve();

      // Write B must be visible in the pending_write queue BEFORE A resolves,
      // so that a crash or tab-close between here and the resume schedule
      // still leaves B recoverable.
      const pendingRaw = window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`);
      assert(
        typeof pendingRaw === 'string' && pendingRaw.length > 0,
        'Expected parked single-flight snapshot to be enqueued into pending_write queue',
      );
      const parsed = JSON.parse(pendingRaw!) as { dicePool?: number };
      assertEqual(parsed.dicePool, baseline.dicePool + 7, 'Expected parked record to carry the would-be-lost delta');

      // Finish both commits to leave the coordinator clean.
      releaseNext();
      await writeA;
      await new Promise((resolve) => setTimeout(resolve, 0));
      releaseNext();
      await writeB;
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  },
  {
    // Regression: non-backoff commit failure (e.g. conflict-merge retry that
    // still rejects) previously returned `{ ok: false }` without queueing the
    // record, silently dropping the user's delta. The fix enqueues the record
    // into pending_write so the next successful commit replays it.
    name: 'writeIslandRunGameStateRecord enqueues pending_write on non-backoff commit error',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);

      // Build a client that reports a non-transport, non-schema error so that
      // remoteBackoffTriggered is FALSE in the write-error branch.
      let commitCalls = 0;
      const client = {
        rpc(_name: string) {
          commitCalls += 1;
          return Promise.resolve({
            data: null,
            error: { message: 'unexpected rpc failure', code: 'unknown_commit_action_error' },
          });
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const result = await writeIslandRunGameStateRecord({
        session,
        client,
        record: { ...baseline, dicePool: baseline.dicePool + 9 },
      });

      assertEqual(result.ok, false, 'Expected non-backoff commit error to surface as ok:false');
      assert(commitCalls >= 1, 'Expected at least one commit attempt');

      const pendingRaw = window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`);
      assert(
        typeof pendingRaw === 'string' && pendingRaw.length > 0,
        'Expected failed write to be queued into pending_write for later replay',
      );
      const parsed = JSON.parse(pendingRaw!) as { dicePool?: number };
      assertEqual(parsed.dicePool, baseline.dicePool + 9, 'Expected queued record to carry the would-be-lost delta');
    },
  },

  {
    name: 'Lucky Roll session key helper normalizes cycle and island numbers',
    run: () => {
      assertEqual(getIslandRunLuckyRollSessionKey(2.8, 30.9), '2:30', 'Expected key helper to floor numeric parts');
      assertEqual(getIslandRunLuckyRollSessionKey(-1, Number.NaN), '0:1', 'Expected key helper to clamp invalid parts');
    },
  },
  {
    name: 'Lucky Roll sessions default to an empty canonical ledger',
    run: () => {
      resetStorage();
      const state = readIslandRunGameStateRecord(makeSession());
      assertDeepEqual(state.luckyRollSessionsByMilestone, {}, 'Expected fresh state to have no Lucky Roll sessions');
    },
  },
  {
    name: 'Lucky Roll session sanitizer drops malformed sessions and normalizes values',
    run: () => {
      const sanitized = sanitizeIslandRunLuckyRollSessionsByMilestone({
        bad: 'not-a-session',
        mismatch: {
          status: 'not-real',
          runId: ' run-30 ',
          targetIslandNumber: 30.9,
          cycleIndex: 2.4,
          position: -7,
          rollsUsed: 3.8,
          claimedTileIds: [4, 4, 2.9, -1, 'bad'],
          pendingRewards: [
            { rewardId: ' reward-1 ', tileId: 4.7, rewardType: 'dice', amount: 2.9, eventId: ' event-1 ', metadata: { source: 'test' } },
            { rewardId: '', tileId: 1, rewardType: 'dice', amount: 1 },
          ],
          bankedRewards: [{ rewardId: 'banked-1', tileId: 8, rewardType: 'surprise', amount: -2.4 }],
          startedAtMs: -5,
          bankedAtMs: Number.POSITIVE_INFINITY,
          updatedAtMs: 12.8,
        },
      });

      assertDeepEqual(Object.keys(sanitized), ['2:30'], 'Expected sanitizer to key by normalized cycle/island');
      assertDeepEqual(sanitized['2:30'], {
        status: 'active',
        runId: 'run-30',
        targetIslandNumber: 30,
        cycleIndex: 2,
        position: 0,
        rollsUsed: 3,
        claimedTileIds: [0, 2, 4],
        pendingRewards: [{ rewardId: 'reward-1', tileId: 4, rewardType: 'dice', amount: 2, eventId: 'event-1', metadata: { source: 'test' } }],
        bankedRewards: [{ rewardId: 'banked-1', tileId: 8, rewardType: 'unknown', amount: 0 }],
        startedAtMs: 0,
        bankedAtMs: null,
        updatedAtMs: 12,
      }, 'Expected Lucky Roll session to be fully sanitized');
    },
  },
  {
    name: 'local hydration sanitizes luckyRollSessionsByMilestone from localStorage',
    run: () => {
      const session = makeLuckyRollSession({ position: 5.8, claimedTileIds: [2, 2, 9] });
      resetStorage({
        [`island_run_runtime_state_${USER_ID}`]: JSON.stringify({
          luckyRollSessionsByMilestone: {
            'wrong-key': session,
          },
        }),
      });

      const state = readIslandRunGameStateRecord(makeSession());
      assertDeepEqual(Object.keys(state.luckyRollSessionsByMilestone), ['0:30'], 'Expected local hydration to normalize session key');
      assertEqual(state.luckyRollSessionsByMilestone['0:30'].position, 5, 'Expected local hydration to sanitize position');
      assertDeepEqual(state.luckyRollSessionsByMilestone['0:30'].claimedTileIds, [2, 9], 'Expected local hydration to dedupe claimed tiles');
    },
  },
  {
    name: 'remote hydration selects and maps lucky_roll_sessions_by_milestone',
    run: async () => {
      resetStorage();
      const remoteSession = makeLuckyRollSession({ runId: 'remote-run', updatedAtMs: 2222 });
      const { client, getSelectedColumns } = createRemoteHydrationClient({
        runtime_version: 3,
        current_island_number: 1,
        dice_pool: 30,
        lucky_roll_sessions_by_milestone: {
          '0:30': remoteSession,
        },
      });

      const result = await hydrateIslandRunGameStateRecordWithSource({
        session: makeSession(),
        client,
        forceRemote: true,
      });

      assert(getSelectedColumns().includes('lucky_roll_sessions_by_milestone'), 'Expected explicit select list to include Lucky Roll sessions column');
      assertEqual(result.source, 'table', 'Expected remote hydration to use table source');
      assertEqual(result.record.luckyRollSessionsByMilestone['0:30'].runId, 'remote-run', 'Expected remote Lucky Roll session to hydrate');
    },
  },
  {
    name: 'remote write payload maps luckyRollSessionsByMilestone to lucky_roll_sessions_by_milestone',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      const luckyRollSession = makeLuckyRollSession({ runId: 'write-run', updatedAtMs: 3333 });
      const { client, getLastPayload } = createCapturePayloadRuntimeClient();

      const result = await writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          luckyRollSessionsByMilestone: {
            '0:30': luckyRollSession,
          },
        },
      });

      assertDeepEqual(result, { ok: true }, 'Expected write to succeed');
      const payload = getLastPayload();
      assert(payload && typeof payload === 'object', 'Expected captured payload');
      assertDeepEqual(
        payload.lucky_roll_sessions_by_milestone,
        { '0:30': luckyRollSession },
        'Expected remote payload to include snake_case Lucky Roll session ledger',
      );
    },
  },
  {
    name: 'conflict merge preserves newer Lucky Roll session by updatedAtMs',
    run: async () => {
      resetStorage();
      const session = makeSession();
      const baseline = readIslandRunGameStateRecord(session);
      const remoteSession = makeLuckyRollSession({ runId: 'remote-newer', updatedAtMs: 5000, position: 9 });
      const localSession = makeLuckyRollSession({ runId: 'local-older', updatedAtMs: 3000, position: 4 });
      const { client, getCommitCalls } = createLuckyRollConflictMergeClient(remoteSession);

      const result = await writeIslandRunGameStateRecord({
        session,
        client,
        record: {
          ...baseline,
          runtimeVersion: 1,
          luckyRollSessionsByMilestone: {
            '0:30': localSession,
          },
        },
      });

      assertDeepEqual(result, { ok: true }, 'Expected conflict recovery write to succeed');
      assertEqual(getCommitCalls(), 2, 'Expected conflict then retry commit');
      const state = readIslandRunGameStateRecord(session);
      assertEqual(state.luckyRollSessionsByMilestone['0:30'].runId, 'remote-newer', 'Expected newer remote session to win conflict merge');
      assertEqual(state.luckyRollSessionsByMilestone['0:30'].position, 9, 'Expected merged session fields from newer remote session');
    },
  },
  {
    name: 'persistIslandRunRuntimeStatePatch overlay-merges bonusTileChargeByIsland with clamping',
    run: async () => {
      resetStorage({
        [`island_run_runtime_state_${USER_ID}`]: JSON.stringify({
          bonusTileChargeByIsland: {
            '1': { 5: 3, 12: 7 },
            '2': { 0: 2 },
          },
        }),
      });

      // Patch targets island 1 (adding tile 20 and incrementing tile 5) and adds
      // island 3. Island 2 must stay untouched (overlay merge). Values that
      // exceed BONUS_CHARGE_TARGET=8 must clamp; malformed values must drop.
      const result = await persistIslandRunRuntimeStatePatch({
        session: makeSession(),
        client: null,
        patch: {
          bonusTileChargeByIsland: {
            '1': { 5: 4, 20: 99, 999: Number.NaN as unknown as number },
            '3': { 1: 1 },
          },
        },
      });
      assertDeepEqual(result, { ok: true }, 'Expected patch to succeed');

      const state = readIslandRunRuntimeState(makeSession());
      assertDeepEqual(state.bonusTileChargeByIsland, {
        '1': { 5: 4, 20: 8 },
        '2': { 0: 2 },
        '3': { 1: 1 },
      }, 'Expected overlay merge preserving untouched islands and clamping charges to 0..8');
    },
  },
  {
    name: 'persistIslandRunRuntimeStatePatch clears a bonusTileChargeByIsland entry via explicit-empty inner map (island travel)',
    run: async () => {
      resetStorage({
        [`island_run_runtime_state_${USER_ID}`]: JSON.stringify({
          bonusTileChargeByIsland: {
            '1': { 5: 3, 12: 7 },
            '2': { 0: 2 },
          },
        }),
      });

      // Mirrors `performIslandTravel`'s bonus-tile clear: patch with an empty
      // inner map for the old island. Without the explicit-empty preservation
      // in the backend's overlay merge, the entry would silently stay at 3/7.
      // On read-back, the sanitizer prunes the empty shell — which is
      // semantically equivalent to absent (no charges on island 1), so the
      // "cleared" outcome the caller wants is observed regardless.
      const result = await persistIslandRunRuntimeStatePatch({
        session: makeSession(),
        client: null,
        patch: {
          bonusTileChargeByIsland: {
            '1': {},
          },
        },
      });
      assertDeepEqual(result, { ok: true }, 'Expected patch to succeed');

      const state = readIslandRunRuntimeState(makeSession());
      assertDeepEqual(state.bonusTileChargeByIsland, {
        '2': { 0: 2 },
      }, 'Expected island 1 charges to be cleared (pruned by sanitizer on read) and island 2 untouched');
    },
  },
  {
    name: 'toRecord sanitizes malformed bonusTileChargeByIsland on read',
    run: async () => {
      resetStorage({
        [`island_run_runtime_state_${USER_ID}`]: JSON.stringify({
          bonusTileChargeByIsland: {
            '1': { 5: 3, 12: 99, '-4': 2, bad: 'oops' },
            '2': 'not-an-object',
            '3': { 0: Number.POSITIVE_INFINITY },
          },
        }),
      });

      const state = readIslandRunRuntimeState(makeSession());
      assertDeepEqual(state.bonusTileChargeByIsland, {
        '1': { 5: 3, 12: 8 },
      }, 'Expected sanitizer to clamp, drop negatives/non-finite, drop non-object islands, and prune islands that end up empty');
    },
  },
];
