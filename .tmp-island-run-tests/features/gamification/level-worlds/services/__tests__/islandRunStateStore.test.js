"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunStateStoreTests = void 0;
const islandRunGameStateStore_1 = require("../islandRunGameStateStore");
const islandRunStateStore_1 = require("../islandRunStateStore");
const testHarness_1 = require("./testHarness");
const USER_ID = 'state-store-user';
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
function resetAll() {
    (0, islandRunGameStateStore_1.resetIslandRunRuntimeCommitCoordinatorForTests)();
    (0, islandRunStateStore_1.__resetIslandRunStateStoreForTests)();
    (0, testHarness_1.installWindowWithStorage)((0, testHarness_1.createMemoryStorage)());
}
function createAlwaysSuccessfulRuntimeClient() {
    const client = {
        rpc(_name, args) {
            const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
            return Promise.resolve({
                data: [{ status: 'applied', runtime_version: expected + 1 }],
                error: null,
            });
        },
    };
    return client;
}
exports.islandRunStateStoreTests = [
    {
        name: 'getIslandRunStateSnapshot returns the default record on first call (fresh localStorage)',
        run: () => {
            resetAll();
            const snapshot = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(makeSession());
            (0, testHarness_1.assert)(snapshot.runtimeVersion === 0, 'expected default runtimeVersion 0');
            (0, testHarness_1.assert)(typeof snapshot.dicePool === 'number', 'dicePool should be a number');
            (0, testHarness_1.assert)(Array.isArray(snapshot.stopStatesByIndex), 'stopStatesByIndex should be array');
        },
    },
    {
        name: 'getIslandRunStateSnapshot returns the SAME reference between calls (stable for useSyncExternalStore)',
        run: () => {
            resetAll();
            const session = makeSession();
            const a = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            const b = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            (0, testHarness_1.assert)(a === b, 'snapshot references should be identical when no mutation has occurred');
        },
    },
    {
        name: 'subscribeIslandRunState: listener is invoked exactly once per commit',
        run: async () => {
            resetAll();
            const session = makeSession();
            const client = createAlwaysSuccessfulRuntimeClient();
            let calls = 0;
            const unsubscribe = (0, islandRunStateStore_1.subscribeIslandRunState)(session, () => {
                calls += 1;
            });
            const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            const next = { ...current, dicePool: current.dicePool + 3, runtimeVersion: current.runtimeVersion + 1 };
            await (0, islandRunStateStore_1.commitIslandRunState)({ session, client, record: next });
            (0, testHarness_1.assertEqual)(calls, 1, 'subscriber should be called exactly once per commit');
            unsubscribe();
        },
    },
    {
        name: 'commitIslandRunState publishes the new record synchronously BEFORE the remote write resolves',
        run: async () => {
            resetAll();
            const session = makeSession();
            const client = createAlwaysSuccessfulRuntimeClient();
            const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            const next = { ...current, dicePool: 42, runtimeVersion: current.runtimeVersion + 1 };
            const commitPromise = (0, islandRunStateStore_1.commitIslandRunState)({ session, client, record: next });
            // Mirror must be updated before the remote write settles.
            const synchronousSnapshot = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            (0, testHarness_1.assertEqual)(synchronousSnapshot.dicePool, 42, 'snapshot must be 42 synchronously after commit call');
            (0, testHarness_1.assertEqual)(synchronousSnapshot.runtimeVersion, current.runtimeVersion + 1, 'runtimeVersion must tick synchronously');
            await commitPromise;
        },
    },
    {
        name: 'unsubscribeIslandRunState: listener stops receiving events after unsubscribe',
        run: async () => {
            resetAll();
            const session = makeSession();
            const client = createAlwaysSuccessfulRuntimeClient();
            let calls = 0;
            const unsubscribe = (0, islandRunStateStore_1.subscribeIslandRunState)(session, () => {
                calls += 1;
            });
            unsubscribe();
            const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            await (0, islandRunStateStore_1.commitIslandRunState)({
                session,
                client,
                record: { ...current, dicePool: current.dicePool + 1, runtimeVersion: current.runtimeVersion + 1 },
            });
            (0, testHarness_1.assertEqual)(calls, 0, 'unsubscribed listener must not be invoked');
        },
    },
    {
        name: 'hydrateIslandRunState: updates the mirror and notifies subscribers',
        run: async () => {
            resetAll();
            const session = makeSession();
            let notifies = 0;
            (0, islandRunStateStore_1.subscribeIslandRunState)(session, () => {
                notifies += 1;
            });
            const result = await (0, islandRunStateStore_1.hydrateIslandRunState)({ session, client: null });
            (0, testHarness_1.assert)(result.record !== undefined, 'hydration must return a record');
            // With client=null the hydration returns the localStorage fallback; the
            // mirror is still republished so subscribers see a fresh snapshot.
            (0, testHarness_1.assertEqual)(notifies, 1, 'hydrate must publish exactly once');
        },
    },
    {
        name: 'resetIslandRunStateSnapshot: replaces the mirror and notifies subscribers',
        run: () => {
            resetAll();
            const session = makeSession();
            let notifies = 0;
            (0, islandRunStateStore_1.subscribeIslandRunState)(session, () => {
                notifies += 1;
            });
            const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            const replacement = { ...current, diamonds: 999 };
            (0, islandRunStateStore_1.resetIslandRunStateSnapshot)(session, replacement);
            (0, testHarness_1.assertEqual)((0, islandRunStateStore_1.getIslandRunStateSnapshot)(session).diamonds, 999, 'snapshot must reflect reset value');
            (0, testHarness_1.assertEqual)(notifies, 1, 'reset must notify exactly once');
        },
    },
    {
        name: 'subscriber that unsubscribes during notification does not perturb other listeners',
        run: async () => {
            resetAll();
            const session = makeSession();
            const client = createAlwaysSuccessfulRuntimeClient();
            let aCalls = 0;
            let bCalls = 0;
            let cCalls = 0;
            const unsubB = (0, islandRunStateStore_1.subscribeIslandRunState)(session, () => {
                bCalls += 1;
            });
            (0, islandRunStateStore_1.subscribeIslandRunState)(session, () => {
                aCalls += 1;
                unsubB();
            });
            (0, islandRunStateStore_1.subscribeIslandRunState)(session, () => {
                cCalls += 1;
            });
            const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
            await (0, islandRunStateStore_1.commitIslandRunState)({
                session,
                client,
                record: { ...current, dicePool: current.dicePool + 1, runtimeVersion: current.runtimeVersion + 1 },
            });
            (0, testHarness_1.assertEqual)(aCalls, 1, 'A listener should fire once');
            // B was subscribed before the unsubscribe-during-notify, and the snapshot
            // is taken at publish start, so B also fires exactly once on this round.
            (0, testHarness_1.assertEqual)(bCalls, 1, 'B listener should fire once (snapshotted before iteration)');
            (0, testHarness_1.assertEqual)(cCalls, 1, 'C listener should fire once');
            (0, testHarness_1.assertEqual)((0, islandRunStateStore_1.__getIslandRunStateSubscriberCountForTests)(session), 2, 'B should be unsubscribed after its iteration');
        },
    },
];
