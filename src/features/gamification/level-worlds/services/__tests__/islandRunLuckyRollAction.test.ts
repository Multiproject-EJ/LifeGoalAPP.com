import {
  advanceIslandRunLuckyRoll,
  bankIslandRunLuckyRollRewards,
  expireIslandRunLuckyRoll,
  startIslandRunLuckyRoll,
} from '../islandRunLuckyRollAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  getIslandRunLuckyRollSessionKey,
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'lucky-roll-action-test-user';
const CYCLE_INDEX = 2;
const TARGET_ISLAND_NUMBER = 60;
const SESSION_KEY = getIslandRunLuckyRollSessionKey(CYCLE_INDEX, TARGET_ISLAND_NUMBER);

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
  __resetIslandRunActionMutexesForTests();
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
  refreshIslandRunStateFromLocal(session);
}

export const islandRunLuckyRollActionTests: TestCase[] = [
  {
    name: 'start creates an active session keyed by cycleIndex:targetIslandNumber',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 4, luckyRollSessionsByMilestone: {} });

      const result = await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'test-run-id',
      });

      assertEqual(result.status, 'started', 'Start should create a new session');
      assertEqual(result.sessionKey, SESSION_KEY, 'Session key should use cycleIndex:targetIslandNumber');
      assertEqual(result.luckyRollSession.status, 'active', 'Session should start active');
      assertEqual(result.luckyRollSession.runId, 'test-run-id', 'Run id should be preserved');

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.runtimeVersion, 5, 'Start should bump runtimeVersion');
      assertEqual(persisted.luckyRollSessionsByMilestone[SESSION_KEY]?.status, 'active', 'Persisted session should be active');
    },
  },
  {
    name: 'start is idempotent for an existing milestone session',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 4, luckyRollSessionsByMilestone: {} });
      await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'first-run',
      });

      const second = await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 2000,
        runId: 'second-run',
      });

      assertEqual(second.status, 'already_exists', 'Second start should no-op');
      assertEqual(second.luckyRollSession.runId, 'first-run', 'Existing run id should be retained');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.runtimeVersion, 5, 'No-op start should not bump runtimeVersion again');
    },
  },
  {
    name: 'advance records pending dice and essence rewards without banking them',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 10, essence: 20, essenceLifetimeEarned: 30, luckyRollSessionsByMilestone: {} });
      await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'advance-run',
      });

      const diceAdvance = await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: { rewardType: 'dice', amount: 3 },
        nowMs: 1100,
      });
      const essenceAdvance = await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 3,
        reward: { rewardType: 'essence', amount: 7 },
        nowMs: 1200,
      });

      assertEqual(diceAdvance.status, 'advanced', 'First advance should remain active');
      assertEqual(diceAdvance.landedTileId, 2, 'First landed tile should be position 2');
      assertEqual(diceAdvance.rewardAdded, true, 'Dice reward should be added to pending rewards');
      assertEqual(essenceAdvance.status, 'advanced', 'Second advance should remain active');
      assertEqual(essenceAdvance.landedTileId, 5, 'Second landed tile should be position 5');
      assertEqual(essenceAdvance.rewardAdded, true, 'Essence reward should be added to pending rewards');

      const persisted = readIslandRunGameStateRecord(makeSession());
      const luckyRollSession = persisted.luckyRollSessionsByMilestone[SESSION_KEY];
      assertEqual(luckyRollSession.pendingRewards.length, 2, 'Two pending rewards should be stored');
      assertEqual(persisted.dicePool, 10, 'Dice should not be awarded before bank');
      assertEqual(persisted.essence, 20, 'Essence should not be awarded before bank');
    },
  },
  {
    name: 'claimed tile ids prevent duplicate pending rewards',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, luckyRollSessionsByMilestone: {} });
      await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'duplicate-tile-run',
      });
      await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: { rewardType: 'dice', amount: 3, rewardId: 'tile-2-dice' },
        nowMs: 1100,
      });

      const current = readIslandRunGameStateRecord(makeSession());
      const sessionAtTileTwo = current.luckyRollSessionsByMilestone[SESSION_KEY];
      void writeIslandRunGameStateRecord({
        session: makeSession(),
        client: null,
        record: {
          ...current,
          luckyRollSessionsByMilestone: {
            ...current.luckyRollSessionsByMilestone,
            [SESSION_KEY]: {
              ...sessionAtTileTwo,
              position: 0,
            },
          },
        },
      });
      refreshIslandRunStateFromLocal(makeSession());

      const duplicate = await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: { rewardType: 'dice', amount: 3, rewardId: 'tile-2-dice-retry' },
        nowMs: 1200,
      });

      assertEqual(duplicate.rewardAdded, false, 'Duplicate tile should not add a second pending reward');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.luckyRollSessionsByMilestone[SESSION_KEY].pendingRewards.length, 1, 'Only the original pending reward should remain');
    },
  },
  {
    name: 'landing on a no-reward tile marks it claimed and blocks a later reward retry',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, luckyRollSessionsByMilestone: {} });
      await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'no-reward-tile-run',
      });

      const noRewardAdvance = await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: null,
        nowMs: 1100,
      });

      assertEqual(noRewardAdvance.rewardAdded, false, 'No reward input should not add a pending reward');
      const afterNoReward = readIslandRunGameStateRecord(makeSession());
      const sessionAfterNoReward = afterNoReward.luckyRollSessionsByMilestone[SESSION_KEY];
      assertEqual(sessionAfterNoReward.claimedTileIds.includes(2), true, 'No-reward landing should still mark tile 2 claimed');
      assertEqual(sessionAfterNoReward.pendingRewards.length, 0, 'No pending reward should be stored for no-reward landing');

      void writeIslandRunGameStateRecord({
        session: makeSession(),
        client: null,
        record: {
          ...afterNoReward,
          luckyRollSessionsByMilestone: {
            ...afterNoReward.luckyRollSessionsByMilestone,
            [SESSION_KEY]: {
              ...sessionAfterNoReward,
              position: 0,
            },
          },
        },
      });
      refreshIslandRunStateFromLocal(makeSession());

      const retry = await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: { rewardType: 'dice', amount: 4, rewardId: 'late-tile-2-dice' },
        nowMs: 1200,
      });

      assertEqual(retry.rewardAdded, false, 'Retry on previously claimed no-reward tile should not add a reward');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.luckyRollSessionsByMilestone[SESSION_KEY].pendingRewards.length, 0, 'No reward should be added after retry');
    },
  },
  {
    name: 'bank applies dice and essence once and moves pending rewards to banked',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 10, essence: 20, essenceLifetimeEarned: 30, luckyRollSessionsByMilestone: {} });
      await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'bank-run',
      });
      await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: { rewardType: 'dice', amount: 3 },
        nowMs: 1100,
      });
      await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 27,
        reward: { rewardType: 'essence', amount: 7 },
        nowMs: 1200,
      });

      const banked = await bankIslandRunLuckyRollRewards({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1300,
      });
      const repeated = await bankIslandRunLuckyRollRewards({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1400,
      });

      assertEqual(banked.status, 'banked', 'Initial bank should succeed');
      assertEqual(banked.diceAwarded, 3, 'Dice reward should be reported');
      assertEqual(banked.essenceAwarded, 7, 'Essence reward should be reported');
      assertEqual(repeated.status, 'already_banked', 'Repeated bank should no-op');
      assertEqual(repeated.diceAwarded, 0, 'Repeated bank should not award dice');
      assertEqual(repeated.essenceAwarded, 0, 'Repeated bank should not award essence');

      const persisted = readIslandRunGameStateRecord(makeSession());
      const luckyRollSession = persisted.luckyRollSessionsByMilestone[SESSION_KEY];
      assertEqual(persisted.dicePool, 13, 'Dice should be awarded exactly once');
      assertEqual(persisted.essence, 27, 'Essence should be awarded exactly once');
      assertEqual(persisted.essenceLifetimeEarned, 37, 'Lifetime earned should include banked essence');
      assertEqual(luckyRollSession.pendingRewards.length, 0, 'Pending rewards should be cleared');
      assertEqual(luckyRollSession.bankedRewards.length, 2, 'Banked rewards should be retained for audit/idempotency');
      assertEqual(luckyRollSession.status, 'banked', 'Session should be marked banked');
    },
  },
  {
    name: 'concurrent bank calls serialize and do not duplicate rewards',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 10, essence: 20, essenceLifetimeEarned: 30, luckyRollSessionsByMilestone: {} });
      await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'concurrent-bank-run',
      });
      await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: { rewardType: 'dice', amount: 5 },
        nowMs: 1100,
      });

      const [first, second] = await Promise.all([
        bankIslandRunLuckyRollRewards({
          session: makeSession(),
          client: null,
          cycleIndex: CYCLE_INDEX,
          targetIslandNumber: TARGET_ISLAND_NUMBER,
          nowMs: 1200,
        }),
        bankIslandRunLuckyRollRewards({
          session: makeSession(),
          client: null,
          cycleIndex: CYCLE_INDEX,
          targetIslandNumber: TARGET_ISLAND_NUMBER,
          nowMs: 1300,
        }),
      ]);

      assertEqual(first.status, 'banked', 'First queued bank should apply');
      assertEqual(second.status, 'already_banked', 'Second queued bank should observe banked status');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 15, 'Dice should be awarded once across concurrent banks');
      assertEqual(persisted.luckyRollSessionsByMilestone[SESSION_KEY].bankedRewards.length, 1, 'Only one banked reward should exist');
    },
  },
  {
    name: 'expire marks an unbanked session expired and prevents later banking',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 0, dicePool: 10, luckyRollSessionsByMilestone: {} });
      await startIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1000,
        runId: 'expire-run',
      });
      await advanceIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        roll: 2,
        reward: { rewardType: 'dice', amount: 5 },
        nowMs: 1100,
      });

      const expired = await expireIslandRunLuckyRoll({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1200,
      });
      const bankAfterExpire = await bankIslandRunLuckyRollRewards({
        session: makeSession(),
        client: null,
        cycleIndex: CYCLE_INDEX,
        targetIslandNumber: TARGET_ISLAND_NUMBER,
        nowMs: 1300,
      });

      assertEqual(expired.status, 'expired', 'Expire should mark the session expired');
      assertEqual(bankAfterExpire.status, 'expired', 'Expired sessions should not bank rewards');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.dicePool, 10, 'Expired pending rewards should not be awarded');
    },
  },
];
