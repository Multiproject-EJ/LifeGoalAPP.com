import { executeIslandRunTileRewardAction } from '../islandRunTileRewardAction';
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

const USER_ID = 'tile-reward-action-test-user';

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
  void writeIslandRunGameStateRecord({
    session,
    client: null,
    record: { ...base, ...overrides },
  });
}

export const islandRunTileRewardActionTests: TestCase[] = [
  {
    name: 'award path: commits essence + reward-bar progress in a single patch',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        essence: 100,
        essenceLifetimeEarned: 200,
        essenceLifetimeSpent: 50,
        rewardBarProgress: 0,
        rewardBarThreshold: 20,
      });

      const result = await executeIslandRunTileRewardAction({
        session: makeSession(),
        client: null,
        islandRunContractV2Enabled: true,
        essenceDelta: 12,
        rewardBarProgress: { source: { kind: 'tile', tileType: 'currency' }, multiplier: 1 },
      });

      assertEqual(result.status, 'ok', 'Award should succeed');
      assertEqual(result.actualEssenceDelta, 12, 'Awarded exactly 12 essence');
      assertEqual(result.essence, 112, 'Wallet bumped 100 → 112');
      assertEqual(result.essenceLifetimeEarned, 212, 'Lifetime earned bumped 200 → 212');
      assertEqual(result.essenceLifetimeSpent, 50, 'Lifetime spent unchanged on award');
      assert(result.rewardBarSlice !== null, 'Reward bar slice populated');
      assert((result.rewardBarSlice?.rewardBarProgress ?? 0) > 0, 'Reward bar progress advanced');

      // Persisted state mirrors the action result.
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.essence, 112, 'Persisted essence mirrors action');
      assertEqual(persisted.essenceLifetimeEarned, 212, 'Persisted lifetime earned mirrors action');
      assertEqual(persisted.rewardBarProgress, result.rewardBarSlice!.rewardBarProgress, 'Persisted reward bar progress mirrors action');
    },
  },
  {
    name: 'hazard path: clamps deduction at wallet size, still writes reward bar progress',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        essence: 4, // wallet shorter than the 10-essence penalty
        essenceLifetimeEarned: 100,
        essenceLifetimeSpent: 60,
        rewardBarProgress: 0,
        rewardBarThreshold: 100,
      });

      const result = await executeIslandRunTileRewardAction({
        session: makeSession(),
        client: null,
        islandRunContractV2Enabled: true,
        essenceDelta: -10,
        rewardBarProgress: null, // hazards don't feed the bar, matches contract
      });

      assertEqual(result.status, 'ok', 'Hazard deduction should succeed');
      assertEqual(result.actualEssenceDelta, -4, 'Clamped at wallet size (4, not 10)');
      assertEqual(result.essence, 0, 'Wallet drained to zero');
      assertEqual(result.essenceLifetimeSpent, 64, 'Lifetime spent grew by actual clamp (4)');
      assertEqual(result.essenceLifetimeEarned, 100, 'Lifetime earned unchanged on hazard');
      assertEqual(result.rewardBarSlice, null, 'No reward-bar slice when rewardBarProgress input omitted');
    },
  },
  {
    name: 'contract disabled: action is a no-op and does not mutate state',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 7, essence: 50 });

      const result = await executeIslandRunTileRewardAction({
        session: makeSession(),
        client: null,
        islandRunContractV2Enabled: false,
        essenceDelta: 15,
        rewardBarProgress: { source: { kind: 'tile', tileType: 'chest' } },
      });

      assertEqual(result.status, 'contract_disabled', 'Reports contract_disabled');
      assertEqual(result.actualEssenceDelta, 0, 'No essence delta applied');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.essence, 50, 'Essence unchanged');
      assertEqual(persisted.runtimeVersion, 7, 'runtimeVersion unchanged — no write happened');
    },
  },
  {
    name: 'zero-delta and no reward-bar: action short-circuits as no_op',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 3, essence: 50 });

      const result = await executeIslandRunTileRewardAction({
        session: makeSession(),
        client: null,
        islandRunContractV2Enabled: true,
        essenceDelta: 0,
        rewardBarProgress: null,
      });

      assertEqual(result.status, 'no_op', 'Reports no_op');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.runtimeVersion, 3, 'runtimeVersion unchanged — no write happened');
    },
  },
  {
    name: 'concurrency: tile-reward and roll fired in parallel serialise (both deltas apply, no clobber)',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        essence: 100,
        essenceLifetimeEarned: 100,
        essenceLifetimeSpent: 0,
        dicePool: 30,
        tokenIndex: 0,
        rewardBarProgress: 0,
        rewardBarThreshold: 200,
      });

      // Fire a roll and a tile-reward in the same tick. Pre-P1-9, the
      // tile-reward patch and the roll write each hydrated off the same
      // pre-state and wrote full records, so one of {essence, dicePool}
      // would silently drop back to its pre-action value depending on
      // write ordering. With the shared mutex the second action always
      // observes the first's commit.
      const pRoll = executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });
      const pTile = executeIslandRunTileRewardAction({
        session: makeSession(),
        client: null,
        islandRunContractV2Enabled: true,
        essenceDelta: 25,
        rewardBarProgress: { source: { kind: 'tile', tileType: 'currency' }, multiplier: 1 },
      });

      const [roll, tile] = await Promise.all([pRoll, pTile]);
      assertEqual(roll.status, 'ok', 'Roll ok');
      assertEqual(tile.status, 'ok', 'Tile reward ok');

      const persisted = readIslandRunGameStateRecord(makeSession());
      // Both deltas must be visible in the final persisted record.
      assertEqual(persisted.dicePool, 29, 'Dice pool shows roll deduction (30 − 1)');
      assertEqual(persisted.essence, 125, 'Essence shows tile award (100 + 25)');
      assertEqual(persisted.essenceLifetimeEarned, 125, 'Lifetime earned shows tile award (100 + 25)');
      assert(persisted.rewardBarProgress > 0, 'Reward bar progress was advanced by the tile landing');
      // Roll action bumps runtimeVersion once; tile-reward uses the patch path
      // which does not bump the version (delta-merge semantics). The important
      // invariant is that both deltas survived — no lost-update race.
      assertEqual(persisted.runtimeVersion, 1, 'Roll bumped runtimeVersion once; tile reward uses patch path (no version bump)');
    },
  },
  {
    name: 'concurrency: two tile rewards in parallel apply both essence deltas (no lost-update)',
    run: async () => {
      resetEnvironment();
      seedState({
        runtimeVersion: 0,
        essence: 100,
        essenceLifetimeEarned: 100,
        rewardBarProgress: 0,
        rewardBarThreshold: 500,
      });

      const pA = executeIslandRunTileRewardAction({
        session: makeSession(),
        client: null,
        islandRunContractV2Enabled: true,
        essenceDelta: 10,
        rewardBarProgress: null,
      });
      const pB = executeIslandRunTileRewardAction({
        session: makeSession(),
        client: null,
        islandRunContractV2Enabled: true,
        essenceDelta: 7,
        rewardBarProgress: null,
      });
      const [a, b] = await Promise.all([pA, pB]);
      assertEqual(a.status, 'ok', 'First tile reward ok');
      assertEqual(b.status, 'ok', 'Second tile reward ok');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.essence, 117, 'Essence shows both deltas applied sequentially (100 + 10 + 7)');
      assertEqual(persisted.essenceLifetimeEarned, 117, 'Lifetime earned reflects both awards');
      // Tile-reward uses the patch path which does NOT bump runtimeVersion
      // (delta-merge semantics). The key invariant is that both essence
      // deltas survived — previously the second write's stale hydrate would
      // have wiped the first write's essence delta.
      assertEqual(persisted.runtimeVersion, 0, 'Patch path preserves runtimeVersion; essence accumulator is the proof of serialisation');
    },
  },
];
