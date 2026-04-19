import {
  __resetIslandRunRollActionMutexesForTests,
  executeIslandRunRollAction,
} from '../islandRunRollAction';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'roll-action-test-user';

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

function resetEnvironment(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunRollActionMutexesForTests();
  installWindowWithStorage(createMemoryStorage());
}

function seedState(overrides: Partial<IslandRunGameStateRecord>): void {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  // Persist synchronously via the store helper (local-only path since client=null).
  void writeIslandRunGameStateRecord({
    session,
    client: null,
    record: { ...base, ...overrides },
  });
}

export const islandRunRollActionTests: TestCase[] = [
  {
    name: 'single ×1 roll: deducts 1 die, bumps runtimeVersion, returns newDicePool / hopSequence',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      const result = await executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 1,
      });

      assertEqual(result.status, 'ok', 'Roll should succeed with 30 dice');
      assert(result.total !== undefined && result.total >= 2 && result.total <= 12, 'Total must be in [2,12]');
      assertEqual(result.diceCost, 1, 'Flat ×1 cost = 1 die');
      assertEqual(result.newDicePool, 29, 'Pool should be 30 - 1 = 29');
      assertEqual(result.newRuntimeVersion, 6, 'runtimeVersion should bump exactly once');
      assert(Array.isArray(result.hopSequence) && result.hopSequence.length === result.total, 'hopSequence length equals total');
      assertEqual(result.hopSequence![result.hopSequence!.length - 1], result.newTokenIndex ?? -1, 'Last hop equals newTokenIndex');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 29, 'Persisted pool mirrors service result');
      assertEqual(persisted.runtimeVersion, 6, 'Persisted runtimeVersion mirrors service result');
      assertEqual(persisted.tokenIndex, result.newTokenIndex!, 'Persisted token index mirrors service result');
    },
  },
  {
    name: '×3 roll: cost scales with multiplier (1 × 3 = 3)',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 50, tokenIndex: 0 });

      const result = await executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 3,
      });

      assertEqual(result.status, 'ok', 'Should succeed with 50 dice at ×3');
      assertEqual(result.diceCost, 3, '×3 cost = 1 × 3 = 3');
      assertEqual(result.newDicePool, 47, 'Pool should be 50 - 3 = 47');
    },
  },
  {
    name: 'insufficient_dice: roll blocked when pool < effective cost (×5 on 4 dice)',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 4, tokenIndex: 0 });

      const result = await executeIslandRunRollAction({
        session: makeSession(),
        client: null,
        diceMultiplier: 5,
      });

      assertEqual(result.status, 'insufficient_dice', 'Needs 5 dice for ×5 but only has 4');
      assertEqual(result.diceCost, undefined, 'No cost reported on blocked roll');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 4, 'Pool unchanged on blocked roll');
      assertEqual(persisted.runtimeVersion, 0, 'runtimeVersion unchanged on blocked roll');
    },
  },
  {
    name: 'concurrency: two rolls fired in parallel serialise (final state = sequential application)',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 10, dicePool: 30, tokenIndex: 0 });

      // Fire both rolls without awaiting in between — this is the race case P0-1
      // specifically calls out. Without the mutex, both calls would read the
      // same pre-state (dicePool=30, runtimeVersion=10), both write
      // runtimeVersion=11, and one roll's delta would drop silently.
      const pA = executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });
      const pB = executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });
      const [a, b] = await Promise.all([pA, pB]);

      assertEqual(a.status, 'ok', 'First roll ok');
      assertEqual(b.status, 'ok', 'Second roll ok');

      // Ordering guarantees: the second roll observed the first roll's commit.
      assertEqual(a.newRuntimeVersion, 11, 'First roll bumps runtimeVersion 10 → 11');
      assertEqual(b.newRuntimeVersion, 12, 'Second roll bumps runtimeVersion 11 → 12 (NOT 11)');
      assertEqual(a.newDicePool, 29, 'First roll pool: 30 → 29');
      assertEqual(b.newDicePool, 28, 'Second roll pool: 29 → 28 (NOT 29)');

      // Final persisted state matches the strictly-sequential application.
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.runtimeVersion, 12, 'Final runtimeVersion reflects both rolls');
      assertEqual(persisted.dicePool, 28, 'Final pool reflects both dice deductions');
      assertEqual(persisted.tokenIndex, b.newTokenIndex!, 'Final token index = second roll result');

      // The second roll's starting token index must equal the first roll's end —
      // proves the second call's read observed the first call's commit.
      const firstRollEnd = a.newTokenIndex!;
      const secondRollEnd = b.newTokenIndex!;
      // Replay the second roll's hop math manually and confirm the chain.
      // hopSequence[0] is the first tile visited by roll B; it must equal
      // firstRollEnd + 1 (mod tileCount). We don't assume tileCount here, but
      // we can assert the chain length matches the total.
      assertEqual(b.hopSequence!.length, b.total!, 'Second roll hop length matches total');
      assert(secondRollEnd !== undefined, 'Second roll produced a token index');
      assert(firstRollEnd !== secondRollEnd || b.total === 40, 'Second roll moved the token from first roll end');
    },
  },
  {
    name: 'concurrency: five parallel rolls apply sequentially with no dropped deltas',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 100, tokenIndex: 0 });

      const rolls = await Promise.all(
        Array.from({ length: 5 }, () =>
          executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 }),
        ),
      );

      // Every roll succeeded.
      rolls.forEach((r, i) => assertEqual(r.status, 'ok', `Roll ${i} ok`));

      // runtimeVersion monotonically increases 1..5 across the serialised batch.
      const versions = rolls.map((r) => r.newRuntimeVersion!).sort((a, b) => a - b);
      for (let i = 0; i < versions.length; i += 1) {
        assertEqual(versions[i], i + 1, `Roll ${i} bumped version to ${i + 1}`);
      }

      // Every roll burned exactly 1 die.
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 100 - 5 * 1, 'Pool decremented by exactly 5 × 1 = 5 dice');
      assertEqual(persisted.runtimeVersion, 5, 'Final runtimeVersion = 5');
    },
  },
];
