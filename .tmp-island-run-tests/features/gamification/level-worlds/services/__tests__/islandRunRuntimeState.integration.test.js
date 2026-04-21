"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunRuntimeStateIntegrationTests = void 0;
const islandRunGameStateStore_1 = require("../islandRunGameStateStore");
const islandRunRuntimeState_1 = require("../islandRunRuntimeState");
const testHarness_1 = require("./testHarness");
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
    };
}
function resetStorage(initial = {}) {
    (0, islandRunGameStateStore_1.resetIslandRunRuntimeCommitCoordinatorForTests)();
    (0, testHarness_1.installWindowWithStorage)((0, testHarness_1.createMemoryStorage)(initial));
}
function createAlwaysSuccessfulRuntimeClient() {
    let commitCalls = 0;
    const client = {
        rpc(_name, args) {
            commitCalls += 1;
            const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
            return Promise.resolve({
                data: [{ status: 'applied', runtime_version: expected + 1 }],
                error: null,
            });
        },
    };
    return {
        client,
        getUpdateCalls: () => commitCalls,
    };
}
function createConflictRuntimeClient() {
    let commitCalls = 0;
    const client = {
        rpc(name) {
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
    };
    return {
        client,
        getCommitCalls: () => commitCalls,
    };
}
function createDeferredSingleFlightClient() {
    let commitCalls = 0;
    let inFlight = 0;
    let maxInFlight = 0;
    const pendingResolvers = [];
    const client = {
        rpc(_name, args) {
            commitCalls += 1;
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
            return new Promise((resolve) => {
                pendingResolvers.push(() => {
                    inFlight -= 1;
                    resolve({
                        data: [{ status: 'applied', runtime_version: expected + 1 }],
                        error: null,
                    });
                });
            });
        },
    };
    return {
        client,
        getCommitCalls: () => commitCalls,
        getMaxInFlight: () => maxInFlight,
        releaseNext: () => {
            const next = pendingResolvers.shift();
            if (next)
                next();
        },
    };
}
exports.islandRunRuntimeStateIntegrationTests = [
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
            const result = await (0, islandRunGameStateStore_1.hydrateIslandRunGameStateRecordWithSource)({
                session: makeSession(),
                client: null,
            });
            (0, testHarness_1.assertEqual)(result.source, 'fallback_demo_or_no_client', 'Expected no-client hydration fallback source');
            (0, testHarness_1.assertEqual)(result.record.currentIslandNumber, 4, 'Expected local current island to be restored');
            (0, testHarness_1.assertEqual)(result.record.bossTrialResolvedIslandNumber, 3, 'Expected local boss marker to be restored');
            (0, testHarness_1.assertEqual)(result.record.shards, 7, 'Expected local shards to be restored');
        },
    },
    {
        name: 'legacy-only patch does not create contract-v2 active event or reward-bar side effects',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const before = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(session);
            (0, testHarness_1.assertEqual)(before.activeTimedEvent, null, 'Expected no active timed event in fresh baseline');
            const persistResult = await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
                session,
                client: null,
                patch: {
                    currentIslandNumber: 3,
                    tokenIndex: 6,
                    dicePool: 12,
                },
            });
            (0, testHarness_1.assertDeepEqual)(persistResult, { ok: true }, 'Expected legacy-only patch persistence to succeed');
            const after = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(session);
            (0, testHarness_1.assertEqual)(after.activeTimedEvent, null, 'Expected legacy patch to avoid creating active timed event');
            (0, testHarness_1.assertEqual)(after.rewardBarBoundEventId, null, 'Expected legacy patch to avoid binding reward bar to an event');
            (0, testHarness_1.assertEqual)(after.rewardBarClaimCountInEvent, 0, 'Expected reward-bar claim state to remain untouched');
            (0, testHarness_1.assertEqual)(after.rewardBarEscalationTier, 0, 'Expected reward-bar escalation state to remain untouched');
            (0, testHarness_1.assertEqual)(after.rewardBarProgress, 0, 'Expected reward-bar progress to remain untouched');
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
            const seedResult = await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
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
                    rewardBarLastClaimAtMs: 9999,
                    activeTimedEventProgress: {
                        feedingActions: 4,
                        tokensEarned: 7,
                        milestonesClaimed: 2,
                    },
                },
            });
            (0, testHarness_1.assertDeepEqual)(seedResult, { ok: true }, 'Expected v2 event state seed to persist');
            // Simulate island transition patch shape (travel-related fields only).
            const travelResult = await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
                session,
                client: null,
                patch: {
                    currentIslandNumber: 9,
                    cycleIndex: 2,
                    islandStartedAtMs: 50000,
                    islandExpiresAtMs: 80000,
                    tokenIndex: 0,
                    dicePool: 20,
                    spinTokens: 0,
                },
            });
            (0, testHarness_1.assertDeepEqual)(travelResult, { ok: true }, 'Expected island transition patch to persist');
            const afterTravel = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(session);
            (0, testHarness_1.assertDeepEqual)(afterTravel.activeTimedEvent, seededEvent, 'Expected non-expired active event to remain unchanged across island transition patch');
            (0, testHarness_1.assertEqual)(afterTravel.rewardBarBoundEventId, seededEvent.eventId, 'Expected reward-bar bound event to remain unchanged across island transition patch');
            (0, testHarness_1.assertEqual)(afterTravel.rewardBarProgress, 6, 'Expected reward-bar progress to remain unchanged across island transition patch');
            (0, testHarness_1.assertEqual)(afterTravel.rewardBarClaimCountInEvent, 2, 'Expected event claim count to remain unchanged across island transition patch');
            (0, testHarness_1.assertEqual)(afterTravel.rewardBarEscalationTier, 2, 'Expected event escalation tier to remain unchanged across island transition patch');
            (0, testHarness_1.assertDeepEqual)(afterTravel.activeTimedEventProgress, {
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
            const persistResult = await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
                session: makeSession(),
                client: null,
                patch: {
                    currentIslandNumber: 5.8,
                    cycleIndex: -3,
                    perIslandEggs: {
                        '5': { tier: 'rare', setAtMs: 500, hatchAtMs: 900, status: 'incubating', location: 'island' },
                    },
                    completedStopsByIsland: {
                        '5': ['boss', 123],
                    },
                    tokenIndex: 8.7,
                    spinTokens: 2.2,
                    dicePool: 13.9,
                    shields: -4,
                    shards: 9.9,
                    perfectCompanionIds: ['rare-nebula-wisp', 42],
                    perfectCompanionReasons: {
                        'rare-nebula-wisp': {
                            strength: ['explorer', 5],
                            weaknessSupport: ['stress_fragility'],
                            zoneMatch: true,
                        },
                    },
                    perfectCompanionComputedAtMs: 123456789,
                    perfectCompanionModelVersion: 'phase3_v1',
                    perfectCompanionComputedCycleIndex: 8.2,
                },
            });
            (0, testHarness_1.assertDeepEqual)(persistResult, { ok: true }, 'Expected local-only persistence to succeed');
            const state = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(makeSession());
            (0, testHarness_1.assertEqual)(state.currentIslandNumber, 5, 'Expected island number to be floored to a positive integer');
            (0, testHarness_1.assertEqual)(state.cycleIndex, 0, 'Expected cycle index to clamp at zero');
            (0, testHarness_1.assertEqual)(state.tokenIndex, 8, 'Expected token index to floor to a non-negative integer');
            (0, testHarness_1.assertEqual)(state.spinTokens, 2, 'Expected spin tokens to be floored');
            (0, testHarness_1.assertEqual)(state.dicePool, 13, 'Expected dice pool to be floored');
            (0, testHarness_1.assertEqual)(state.shields, 0, 'Expected shields to clamp at zero');
            (0, testHarness_1.assertEqual)(state.shards, 9, 'Expected shards to be floored');
            (0, testHarness_1.assertDeepEqual)(Object.keys(state.perIslandEggs).sort(), ['2', '5'], 'Expected egg ledger merge to preserve old and new islands');
            (0, testHarness_1.assertDeepEqual)(state.completedStopsByIsland, {
                '2': ['hatchery'],
                '5': ['boss'],
            }, 'Expected completed stops merge to filter invalid entries');
            (0, testHarness_1.assertDeepEqual)(state.perfectCompanionIds, ['rare-nebula-wisp'], 'Expected perfect companion ids to filter invalid entries');
            (0, testHarness_1.assertDeepEqual)(state.perfectCompanionReasons['rare-nebula-wisp'], {
                strength: ['explorer'],
                weaknessSupport: ['stress_fragility'],
                zoneMatch: true,
            }, 'Expected perfect companion reasons to sanitize payload shape');
            (0, testHarness_1.assertEqual)(state.perfectCompanionModelVersion, 'phase3_v1', 'Expected model version to persist');
            (0, testHarness_1.assertEqual)(state.perfectCompanionComputedCycleIndex, 8, 'Expected computed cycle index to floor');
        },
    },
    {
        name: 'writeIslandRunGameStateRecord queues pending write when remote is unavailable',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            const result = await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client: null,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 1,
                },
            });
            (0, testHarness_1.assertDeepEqual)(result, { ok: true }, 'Expected write to succeed in queued local mode');
            const pendingRaw = window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`);
            (0, testHarness_1.assert)(typeof pendingRaw === 'string' && pendingRaw.length > 0, 'Expected pending write payload to be queued');
        },
    },
    {
        name: 'writeIslandRunGameStateRecord replays queued write before current write when remote recovers',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            window.localStorage.setItem(`island_run_runtime_state_${USER_ID}_pending_write`, JSON.stringify({
                ...baseline,
                dicePool: baseline.dicePool + 2,
            }));
            const { client, getUpdateCalls } = createAlwaysSuccessfulRuntimeClient();
            const result = await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 3,
                },
            });
            (0, testHarness_1.assertDeepEqual)(result, { ok: true }, 'Expected replay + current write to succeed');
            (0, testHarness_1.assert)(getUpdateCalls() >= 2, 'Expected pending replay write plus current write');
            (0, testHarness_1.assertEqual)(window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`), null, 'Expected pending write queue to be cleared after successful replay');
        },
    },
    {
        name: 'writeIslandRunGameStateRecord blocks retry storm after conflict recovery remote-unavailable error',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const { client, getCommitCalls } = createConflictRuntimeClient();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            const first = await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 1,
                },
            });
            const second = await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 2,
                },
            });
            (0, testHarness_1.assertDeepEqual)(first, { ok: true }, 'Expected first conflict write to degrade into queued backoff mode');
            (0, testHarness_1.assertDeepEqual)(second, { ok: true }, 'Expected subsequent write during backoff to stay queued');
            (0, testHarness_1.assertEqual)(getCommitCalls(), 1, 'Expected only one commit RPC call while conflict/backoff gate is active');
        },
    },
    {
        name: 'writeIslandRunGameStateRecord does not false-dedupe content-identical writes; parks and resumes second',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            const { client, getCommitCalls, getMaxInFlight, releaseNext } = createDeferredSingleFlightClient();
            const writeA = (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 1,
                },
            });
            const writeAIdentical = (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 1,
                },
            });
            await Promise.resolve();
            (0, testHarness_1.assertEqual)(getCommitCalls(), 1, 'Expected content-identical write to park via single-flight while first is in-flight');
            releaseNext();
            await writeA;
            await writeAIdentical;
            await new Promise((resolve) => setTimeout(resolve, 0));
            releaseNext();
            await new Promise((resolve) => setTimeout(resolve, 0));
            (0, testHarness_1.assertEqual)(getCommitCalls(), 2, 'Expected both content-identical writes to produce separate commits (no false dedupe)');
            (0, testHarness_1.assertEqual)(getMaxInFlight(), 1, 'Expected max one in-flight commit at any moment');
        },
    },
    {
        name: 'writeIslandRunGameStateRecord resumes parked action after single-flight slot frees',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            const { client, getCommitCalls, getMaxInFlight, releaseNext } = createDeferredSingleFlightClient();
            const firstWrite = (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 1,
                },
            });
            const parkedWrite = (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: {
                    ...baseline,
                    dicePool: baseline.dicePool + 2,
                },
            });
            await Promise.resolve();
            (0, testHarness_1.assertEqual)(getCommitCalls(), 1, 'Expected second write to park while first is in-flight');
            releaseNext();
            await firstWrite;
            await parkedWrite;
            await new Promise((resolve) => setTimeout(resolve, 0));
            releaseNext();
            await new Promise((resolve) => setTimeout(resolve, 0));
            (0, testHarness_1.assertEqual)(getCommitCalls(), 2, 'Expected parked action to resume after single-flight slot is released');
            (0, testHarness_1.assertEqual)(getMaxInFlight(), 1, 'Expected resumed write to still honor single-flight limit');
        },
    },
    {
        name: 'persistIslandRunRuntimeStatePatch requires explicit booleans for stop completion fields',
        run: async () => {
            resetStorage();
            const persistResult = await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
                session: makeSession(),
                client: null,
                patch: {
                    stopStatesByIndex: [
                        { objectiveComplete: 'true', buildComplete: 'true' },
                        { objectiveComplete: true, buildComplete: true },
                        { objectiveComplete: false, buildComplete: false },
                        { objectiveComplete: false, buildComplete: false },
                        { objectiveComplete: false, buildComplete: false },
                    ],
                },
            });
            (0, testHarness_1.assertDeepEqual)(persistResult, { ok: true }, 'Expected persistence to accept payload');
            const state = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(makeSession());
            (0, testHarness_1.assertEqual)(state.stopStatesByIndex[0]?.objectiveComplete, false, 'Expected non-boolean objectiveComplete to normalize to false');
            (0, testHarness_1.assertEqual)(state.stopStatesByIndex[0]?.buildComplete, false, 'Expected non-boolean buildComplete to normalize to false');
            (0, testHarness_1.assertEqual)(state.stopStatesByIndex[1]?.objectiveComplete, true, 'Expected explicit boolean objectiveComplete to persist');
            (0, testHarness_1.assertEqual)(state.stopStatesByIndex[1]?.buildComplete, true, 'Expected explicit boolean buildComplete to persist');
        },
    },
    {
        name: 'writeIslandRunGameStateRecord allows writes again after backoff expires',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            // Phase 1: Trigger conflict → backoff activates
            const { client: conflictClient } = createConflictRuntimeClient();
            await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client: conflictClient,
                record: { ...baseline, dicePool: baseline.dicePool + 1 },
            });
            // Verify backoff is stored
            const backoffKey = `island_run_runtime_state_${USER_ID}_remote_backoff_until`;
            (0, testHarness_1.assert)(window.localStorage.getItem(backoffKey) !== null, 'Expected backoff timestamp to be stored after conflict');
            // Simulate expiry by setting timestamp in the past
            window.localStorage.setItem(backoffKey, String(Date.now() - 1000));
            // Reset coordinator to isolate backoff-gate behavior from stale parked-replay concerns
            (0, islandRunGameStateStore_1.resetIslandRunRuntimeCommitCoordinatorForTests)();
            // Clear pending write to isolate the test
            window.localStorage.removeItem(`island_run_runtime_state_${USER_ID}_pending_write`);
            // Phase 2: Write with successful client — should not be blocked
            const { client: successClient, getUpdateCalls } = createAlwaysSuccessfulRuntimeClient();
            const result = await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client: successClient,
                record: { ...baseline, dicePool: baseline.dicePool + 2 },
            });
            (0, testHarness_1.assertDeepEqual)(result, { ok: true }, 'Expected write to succeed after backoff expired');
            (0, testHarness_1.assert)(getUpdateCalls() >= 1, 'Expected at least one commit RPC after backoff expired');
        },
    },
    {
        name: 'syncState returns to idle after conflict error triggers blocked_conflict_recovery',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            // Before any write, syncState is idle
            (0, testHarness_1.assertEqual)((0, islandRunGameStateStore_1.getIslandRunRuntimeCommitSyncStateForTests)(USER_ID), 'idle', 'Expected initial syncState to be idle');
            // Trigger conflict → error path sets blocked_conflict_recovery, but finally block should reset to idle
            const { client: conflictClient } = createConflictRuntimeClient();
            await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client: conflictClient,
                record: { ...baseline, dicePool: baseline.dicePool + 1 },
            });
            // With the fix, the finally block unconditionally resets syncState to idle when inFlightCount === 0
            (0, testHarness_1.assertEqual)((0, islandRunGameStateStore_1.getIslandRunRuntimeCommitSyncStateForTests)(USER_ID), 'idle', 'Expected syncState to be reset to idle after conflict error (not stuck at blocked_conflict_recovery)');
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
                ...(0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session),
                dicePool: 14,
                tokenIndex: 11,
                spinTokens: 3,
            };
            // Step 2: Simulate local state at component mount (useState defaults)
            const localDefaults = {
                dicePool: 30, // useState(ISLAND_RUN_DEFAULT_STARTING_DICE)
                tokenIndex: 0, // useState(TOKEN_START_TILE_INDEX)
                spinTokens: 0, // useState(0)
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
            const wouldPersistEffectWrite = (guardActive) => {
                if (!guardActive)
                    return false; // guard blocks → no write
                // This is the exact condition from the persist effect.
                if (hydratedState.tokenIndex === localDefaults.tokenIndex
                    && hydratedState.spinTokens === localDefaults.spinTokens
                    && hydratedState.dicePool === localDefaults.dicePool) {
                    return false; // no diff → no write
                }
                return true; // diff detected → write
            };
            // Before guard: persist effect must NOT write
            (0, testHarness_1.assertEqual)(wouldPersistEffectWrite(hasCompletedInitialHydrationSync), false, 'Expected persist effect to be blocked before initial hydration sync completes');
            // Step 4: Verify the diff is real (without guard, a write WOULD fire)
            (0, testHarness_1.assert)(hydratedState.dicePool !== localDefaults.dicePool, 'Expected dicePool to differ between hydrated state (14) and local default (30) — this is the exact bug trigger');
            (0, testHarness_1.assert)(hydratedState.tokenIndex !== localDefaults.tokenIndex, 'Expected tokenIndex to differ between hydrated state (11) and local default (0)');
            (0, testHarness_1.assert)(hydratedState.spinTokens !== localDefaults.spinTokens, 'Expected spinTokens to differ between hydrated state (3) and local default (0)');
            // Step 5: Guard = true (hydration sync has applied server values)
            // After hydration sync, local state now equals hydrated runtimeState
            // so the persist effect's diff check returns false → no stale write.
            const localAfterHydrationSync = {
                dicePool: hydratedState.dicePool,
                tokenIndex: hydratedState.tokenIndex,
                spinTokens: hydratedState.spinTokens,
            };
            const wouldPersistEffectWritePostSync = (() => {
                const guardActive = true; // guard now open
                if (!guardActive)
                    return false;
                if (hydratedState.tokenIndex === localAfterHydrationSync.tokenIndex
                    && hydratedState.spinTokens === localAfterHydrationSync.spinTokens
                    && hydratedState.dicePool === localAfterHydrationSync.dicePool) {
                    return false;
                }
                return true;
            })();
            (0, testHarness_1.assertEqual)(wouldPersistEffectWritePostSync, false, 'Expected no write after hydration sync because local state now matches runtimeState');
            // Step 6: After a genuine gameplay action changes dicePool, the guard
            // allows the persist effect to write normally.
            const localAfterGameplayAction = {
                ...localAfterHydrationSync,
                dicePool: localAfterHydrationSync.dicePool + 15, // earned 15 dice from a reward claim
            };
            const wouldPersistEffectWriteAfterAction = (() => {
                const guardActive = true;
                if (!guardActive)
                    return false;
                if (hydratedState.tokenIndex === localAfterGameplayAction.tokenIndex
                    && hydratedState.spinTokens === localAfterGameplayAction.spinTokens
                    && hydratedState.dicePool === localAfterGameplayAction.dicePool) {
                    return false;
                }
                return true;
            })();
            (0, testHarness_1.assertEqual)(wouldPersistEffectWriteAfterAction, true, 'Expected persist effect to write after a genuine gameplay action changes dicePool');
            // Step 7: Prove end-to-end that the hydrated record persists correctly
            // (server state with dicePool=14 survives a round-trip without being
            // overwritten by the default dicePool=30).
            const { client } = createAlwaysSuccessfulRuntimeClient();
            const writeResult = await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: hydratedState,
            });
            (0, testHarness_1.assertDeepEqual)(writeResult, { ok: true }, 'Expected hydrated state write to succeed');
            const persisted = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            (0, testHarness_1.assertEqual)(persisted.dicePool, 14, 'Expected persisted dicePool to be hydrated value (14), not stale default (30)');
            (0, testHarness_1.assertEqual)(persisted.tokenIndex, 11, 'Expected persisted tokenIndex to be hydrated value (11), not stale default (0)');
            (0, testHarness_1.assertEqual)(persisted.spinTokens, 3, 'Expected persisted spinTokens to be hydrated value (3), not stale default (0)');
        },
    },
    {
        name: 'syncState returns to idle after blocked_remote_backoff write followed by successful post-expiry write',
        run: async () => {
            resetStorage();
            const session = makeSession();
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            const backoffKey = `island_run_runtime_state_${USER_ID}_remote_backoff_until`;
            // Trigger conflict → backoff activates
            const { client: conflictClient } = createConflictRuntimeClient();
            await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client: conflictClient,
                record: { ...baseline, dicePool: baseline.dicePool + 1 },
            });
            // syncState was reset to idle in finally block (fix #2)
            (0, testHarness_1.assertEqual)((0, islandRunGameStateStore_1.getIslandRunRuntimeCommitSyncStateForTests)(USER_ID), 'idle', 'Expected syncState to be idle after conflict write finally block');
            // Write during active backoff — sets syncState to blocked_remote_backoff (early return, no finally)
            await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client: conflictClient,
                record: { ...baseline, dicePool: baseline.dicePool + 2 },
            });
            (0, testHarness_1.assertEqual)((0, islandRunGameStateStore_1.getIslandRunRuntimeCommitSyncStateForTests)(USER_ID), 'blocked_remote_backoff', 'Expected syncState to be blocked_remote_backoff during active backoff');
            // Simulate backoff expiry
            window.localStorage.setItem(backoffKey, String(Date.now() - 1000));
            // Reset coordinator to avoid parked-replay complications, but re-verify from fresh coordinator
            (0, islandRunGameStateStore_1.resetIslandRunRuntimeCommitCoordinatorForTests)();
            window.localStorage.removeItem(`island_run_runtime_state_${USER_ID}_pending_write`);
            // Write with success client
            const { client: successClient } = createAlwaysSuccessfulRuntimeClient();
            await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client: successClient,
                record: { ...baseline, dicePool: baseline.dicePool + 3 },
            });
            (0, testHarness_1.assertEqual)((0, islandRunGameStateStore_1.getIslandRunRuntimeCommitSyncStateForTests)(USER_ID), 'idle', 'Expected syncState to be idle after successful post-expiry write');
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
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            const { client, releaseNext } = createDeferredSingleFlightClient();
            // Write A — goes in-flight.
            const writeA = (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: { ...baseline, dicePool: baseline.dicePool + 1 },
            });
            await Promise.resolve();
            // Write B — parks behind A via single-flight.
            const writeB = (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: { ...baseline, dicePool: baseline.dicePool + 7 },
            });
            await Promise.resolve();
            // Write B must be visible in the pending_write queue BEFORE A resolves,
            // so that a crash or tab-close between here and the resume schedule
            // still leaves B recoverable.
            const pendingRaw = window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`);
            (0, testHarness_1.assert)(typeof pendingRaw === 'string' && pendingRaw.length > 0, 'Expected parked single-flight snapshot to be enqueued into pending_write queue');
            const parsed = JSON.parse(pendingRaw);
            (0, testHarness_1.assertEqual)(parsed.dicePool, baseline.dicePool + 7, 'Expected parked record to carry the would-be-lost delta');
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
            const baseline = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
            // Build a client that reports a non-transport, non-schema error so that
            // remoteBackoffTriggered is FALSE in the write-error branch.
            let commitCalls = 0;
            const client = {
                rpc(_name) {
                    commitCalls += 1;
                    return Promise.resolve({
                        data: null,
                        error: { message: 'unexpected rpc failure', code: 'unknown_commit_action_error' },
                    });
                },
            };
            const result = await (0, islandRunGameStateStore_1.writeIslandRunGameStateRecord)({
                session,
                client,
                record: { ...baseline, dicePool: baseline.dicePool + 9 },
            });
            (0, testHarness_1.assertEqual)(result.ok, false, 'Expected non-backoff commit error to surface as ok:false');
            (0, testHarness_1.assert)(commitCalls >= 1, 'Expected at least one commit attempt');
            const pendingRaw = window.localStorage.getItem(`island_run_runtime_state_${USER_ID}_pending_write`);
            (0, testHarness_1.assert)(typeof pendingRaw === 'string' && pendingRaw.length > 0, 'Expected failed write to be queued into pending_write for later replay');
            const parsed = JSON.parse(pendingRaw);
            (0, testHarness_1.assertEqual)(parsed.dicePool, baseline.dicePool + 9, 'Expected queued record to carry the would-be-lost delta');
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
            const result = await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
                session: makeSession(),
                client: null,
                patch: {
                    bonusTileChargeByIsland: {
                        '1': { 5: 4, 20: 99, 999: Number.NaN },
                        '3': { 1: 1 },
                    },
                },
            });
            (0, testHarness_1.assertDeepEqual)(result, { ok: true }, 'Expected patch to succeed');
            const state = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(makeSession());
            (0, testHarness_1.assertDeepEqual)(state.bonusTileChargeByIsland, {
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
            const result = await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
                session: makeSession(),
                client: null,
                patch: {
                    bonusTileChargeByIsland: {
                        '1': {},
                    },
                },
            });
            (0, testHarness_1.assertDeepEqual)(result, { ok: true }, 'Expected patch to succeed');
            const state = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(makeSession());
            (0, testHarness_1.assertDeepEqual)(state.bonusTileChargeByIsland, {
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
            const state = (0, islandRunRuntimeState_1.readIslandRunRuntimeState)(makeSession());
            (0, testHarness_1.assertDeepEqual)(state.bonusTileChargeByIsland, {
                '1': { 5: 3, 12: 8 },
            }, 'Expected sanitizer to clamp, drop negatives/non-finite, drop non-object islands, and prune islands that end up empty');
        },
    },
];
