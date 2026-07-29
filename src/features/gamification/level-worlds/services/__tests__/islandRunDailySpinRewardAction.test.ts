import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { grantDailySpinIslandRunRewards } from '../islandRunDailySpinRewardAction';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  getIslandRunStateSnapshot,
  hydrateIslandRunState,
} from '../islandRunStateStore';
import { assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'daily-spin-reward-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: USER_ID, user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

async function seedWallet(dicePool = 30, essence = 10, shards = 2): Promise<void> {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      dicePool,
      essence,
      essenceLifetimeEarned: essence,
      shards,
      runtimeVersion: base.runtimeVersion + 1,
    },
  });
  await hydrateIslandRunState({ session, client: null });
}

function resetHarness(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

export const islandRunDailySpinRewardActionTests: TestCase[] = [
  {
    name: 'Daily Spin dice reward credits the canonical dice pool and survives hydration',
    run: async () => {
      resetHarness();
      await seedWallet();
      const session = makeSession();

      const result = await grantDailySpinIslandRunRewards({
        session,
        client: null,
        deltas: { dice: 125, essence: 0, shards: 0 },
      });

      assertEqual(result.ok, true, 'reward commit should succeed');
      assertEqual(getIslandRunStateSnapshot(session).dicePool, 155, 'live dice pool should increase immediately');

      __resetIslandRunStateStoreForTests();
      const hydrated = await hydrateIslandRunState({ session, client: null });
      assertEqual(hydrated.record.dicePool, 155, 'reloaded dice pool should retain the wheel award');
    },
  },
  {
    name: 'Island 3 jackpot credits all 2000 dice to the same playable wallet',
    run: async () => {
      resetHarness();
      await seedWallet();
      const session = makeSession();

      const result = await grantDailySpinIslandRunRewards({
        session,
        client: null,
        deltas: { dice: 2000, essence: 0, shards: 0 },
        triggerSource: 'daily_spin:island_3_jackpot',
      });

      assertEqual(result.ok, true, 'jackpot reward commit should succeed');
      assertEqual(
        getIslandRunStateSnapshot(session).dicePool,
        2030,
        'the Island Run board should immediately see all jackpot dice',
      );

      __resetIslandRunStateStoreForTests();
      const hydrated = await hydrateIslandRunState({ session, client: null });
      assertEqual(hydrated.record.dicePool, 2030, 'jackpot dice should survive an app reload');
    },
  },
  {
    name: 'Daily Spin treasure bundle commits dice, essence, and shards atomically',
    run: async () => {
      resetHarness();
      await seedWallet();
      const session = makeSession();

      const result = await grantDailySpinIslandRunRewards({
        session,
        client: null,
        deltas: { dice: 100, essence: 20, shards: 3 },
      });

      assertEqual(result.record.dicePool, 130, 'treasure dice should reach the canonical wallet');
      assertEqual(result.record.essence, 30, 'treasure money should reach the canonical wallet');
      assertEqual(result.record.essenceLifetimeEarned, 30, 'earned money should update lifetime income');
      assertEqual(result.record.shards, 5, 'treasure essence should reach the canonical wallet');
    },
  },
  {
    name: 'concurrent Daily Spin reward actions compose without dropping dice',
    run: async () => {
      resetHarness();
      await seedWallet();
      const session = makeSession();

      await Promise.all([
        grantDailySpinIslandRunRewards({
          session,
          client: null,
          deltas: { dice: 50, essence: 0, shards: 0 },
        }),
        grantDailySpinIslandRunRewards({
          session,
          client: null,
          deltas: { dice: 125, essence: 0, shards: 0 },
        }),
      ]);

      assertEqual(getIslandRunStateSnapshot(session).dicePool, 205, 'both serialized dice grants should survive');
    },
  },
];
