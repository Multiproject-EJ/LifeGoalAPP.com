import {
  ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE,
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __getIslandRunStateSubscriberCountForTests,
  __resetIslandRunStateStoreForTests,
  commitIslandRunState,
  getIslandRunStateSnapshot,
  hydrateIslandRunState,
  resetIslandRunStateSnapshot,
  subscribeIslandRunState,
} from '../islandRunStateStore';
import {
  assert,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

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
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetAll(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

function createAlwaysSuccessfulRuntimeClient() {
  const client = {
    rpc(_name: string, args: { p_expected_runtime_version?: number }) {
      const expected = Math.max(0, Math.floor(args.p_expected_runtime_version ?? 0));
      return Promise.resolve({
        data: [{ status: 'applied', runtime_version: expected + 1 }],
        error: null,
      });
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
  return client;
}

export const islandRunStateStoreTests: TestCase[] = [
  {
    name: 'getIslandRunStateSnapshot returns the default record on first call (fresh localStorage)',
    run: () => {
      resetAll();
      const snapshot = getIslandRunStateSnapshot(makeSession());
      assert(snapshot.runtimeVersion === 0, 'expected default runtimeVersion 0');
      assertEqual(
        snapshot.firstSessionTutorialState,
        ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE,
        'new players should start with the tutorial initial state',
      );
      assert(typeof snapshot.dicePool === 'number', 'dicePool should be a number');
      assert(Array.isArray(snapshot.stopStatesByIndex), 'stopStatesByIndex should be array');
    },
  },
  {
    name: 'readIslandRunGameStateRecord hydrates existing local records without tutorial state safely',
    run: () => {
      resetAll();
      const session = makeSession();
      window.localStorage.setItem(
        `island_run_runtime_state_${USER_ID}`,
        JSON.stringify({ runtimeVersion: 3, dicePool: 12 }),
      );

      const record = readIslandRunGameStateRecord(session);

      assertEqual(record.runtimeVersion, 3, 'existing runtimeVersion should hydrate');
      assertEqual(record.dicePool, 12, 'existing dicePool should hydrate');
      assertEqual(
        record.firstSessionTutorialState,
        ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE,
        'missing tutorial state should fall back safely',
      );
    },
  },
  {
    name: 'firstSessionTutorialState persists through local store serialization',
    run: async () => {
      resetAll();
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);

      await writeIslandRunGameStateRecord({
        session,
        client: null,
        record: {
          ...base,
          firstSessionTutorialState: 'awaiting_first_roll',
          runtimeVersion: base.runtimeVersion + 1,
        },
      });

      const record = readIslandRunGameStateRecord(session);
      assertEqual(
        record.firstSessionTutorialState,
        'awaiting_first_roll',
        'tutorial state should round-trip through localStorage',
      );
    },
  },
  {
    name: 'readIslandRunGameStateRecord falls back safely for invalid tutorial state values',
    run: () => {
      resetAll();
      const session = makeSession();
      window.localStorage.setItem(
        `island_run_runtime_state_${USER_ID}`,
        JSON.stringify({
          runtimeVersion: 4,
          firstSessionTutorialState: 'future_unknown_state',
        }),
      );

      const record = readIslandRunGameStateRecord(session);

      assertEqual(
        record.firstSessionTutorialState,
        ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE,
        'unknown tutorial state should fall back safely',
      );
    },
  },
  {
    name: 'getIslandRunStateSnapshot returns the SAME reference between calls (stable for useSyncExternalStore)',
    run: () => {
      resetAll();
      const session = makeSession();
      const a = getIslandRunStateSnapshot(session);
      const b = getIslandRunStateSnapshot(session);
      assert(a === b, 'snapshot references should be identical when no mutation has occurred');
    },
  },
  {
    name: 'subscribeIslandRunState: listener is invoked exactly once per commit',
    run: async () => {
      resetAll();
      const session = makeSession();
      const client = createAlwaysSuccessfulRuntimeClient();
      let calls = 0;
      const unsubscribe = subscribeIslandRunState(session, () => {
        calls += 1;
      });

      const current = getIslandRunStateSnapshot(session);
      const next = { ...current, dicePool: current.dicePool + 3, runtimeVersion: current.runtimeVersion + 1 };
      await commitIslandRunState({ session, client, record: next });

      assertEqual(calls, 1, 'subscriber should be called exactly once per commit');
      unsubscribe();
    },
  },
  {
    name: 'commitIslandRunState publishes the new record synchronously BEFORE the remote write resolves',
    run: async () => {
      resetAll();
      const session = makeSession();
      const client = createAlwaysSuccessfulRuntimeClient();

      const current = getIslandRunStateSnapshot(session);
      const next = { ...current, dicePool: 42, runtimeVersion: current.runtimeVersion + 1 };
      const commitPromise = commitIslandRunState({ session, client, record: next });

      // Mirror must be updated before the remote write settles.
      const synchronousSnapshot = getIslandRunStateSnapshot(session);
      assertEqual(synchronousSnapshot.dicePool, 42, 'snapshot must be 42 synchronously after commit call');
      assertEqual(synchronousSnapshot.runtimeVersion, current.runtimeVersion + 1, 'runtimeVersion must tick synchronously');

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
      const unsubscribe = subscribeIslandRunState(session, () => {
        calls += 1;
      });
      unsubscribe();

      const current = getIslandRunStateSnapshot(session);
      await commitIslandRunState({
        session,
        client,
        record: { ...current, dicePool: current.dicePool + 1, runtimeVersion: current.runtimeVersion + 1 },
      });
      assertEqual(calls, 0, 'unsubscribed listener must not be invoked');
    },
  },
  {
    name: 'hydrateIslandRunState: updates the mirror and notifies subscribers',
    run: async () => {
      resetAll();
      const session = makeSession();
      let notifies = 0;
      subscribeIslandRunState(session, () => {
        notifies += 1;
      });

      const result = await hydrateIslandRunState({ session, client: null });
      assert(result.record !== undefined, 'hydration must return a record');
      // With client=null the hydration returns the localStorage fallback; the
      // mirror is still republished so subscribers see a fresh snapshot.
      assertEqual(notifies, 1, 'hydrate must publish exactly once');
    },
  },
  {
    name: 'resetIslandRunStateSnapshot: replaces the mirror and notifies subscribers',
    run: () => {
      resetAll();
      const session = makeSession();
      let notifies = 0;
      subscribeIslandRunState(session, () => {
        notifies += 1;
      });

      const current = getIslandRunStateSnapshot(session);
      const replacement = { ...current, diamonds: 999 };
      resetIslandRunStateSnapshot(session, replacement);

      assertEqual(getIslandRunStateSnapshot(session).diamonds, 999, 'snapshot must reflect reset value');
      assertEqual(notifies, 1, 'reset must notify exactly once');
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
      const unsubB = subscribeIslandRunState(session, () => {
        bCalls += 1;
      });
      subscribeIslandRunState(session, () => {
        aCalls += 1;
        unsubB();
      });
      subscribeIslandRunState(session, () => {
        cCalls += 1;
      });

      const current = getIslandRunStateSnapshot(session);
      await commitIslandRunState({
        session,
        client,
        record: { ...current, dicePool: current.dicePool + 1, runtimeVersion: current.runtimeVersion + 1 },
      });

      assertEqual(aCalls, 1, 'A listener should fire once');
      // B was subscribed before the unsubscribe-during-notify, and the snapshot
      // is taken at publish start, so B also fires exactly once on this round.
      assertEqual(bCalls, 1, 'B listener should fire once (snapshotted before iteration)');
      assertEqual(cCalls, 1, 'C listener should fire once');
      assertEqual(
        __getIslandRunStateSubscriberCountForTests(session),
        2,
        'B should be unsubscribed after its iteration',
      );
    },
  },
];
