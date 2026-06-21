import { claimCombinedJourneyReward } from '../combinedJourneyRewardClaimAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import {
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'combined-journey-reward-claim-test-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: USER_ID, user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetEnvironment(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  __resetIslandRunFeatureFlagsForTests();
  installWindowWithStorage(createMemoryStorage());
}

async function seedState(overrides: Partial<IslandRunGameStateRecord>): Promise<void> {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({ session, client: null, record: { ...base, ...overrides } });
  refreshIslandRunStateFromLocal(session);
}

/**
 * Minimal Supabase client double that mirrors the SQL claim RPC's idempotency
 * (one grant per threshold) and accepts the runtime commit RPC so the grant
 * persists cleanly.
 */
function makeFakeClient() {
  const claimed = new Set<number>();
  let claimCalls = 0;
  const client = {
    rpc: async (name: string, params: Record<string, unknown>) => {
      if (name === 'claim_combined_journey_reward') {
        claimCalls += 1;
        const level = Number(params.p_threshold_level);
        const band = Math.floor(level / 5);
        const kind = level % 2 === 0 ? 'dice' : 'essence';
        const amount = level % 2 === 0 ? 10 + 5 * band : 5 + 3 * band;
        const isNew = !claimed.has(level);
        claimed.add(level);
        return { data: [{ claimed: isNew, reward_kind: kind, reward_amount: amount }], error: null };
      }
      if (name === 'island_run_commit_action') {
        const expected = Number(params.p_expected_runtime_version ?? 0);
        return { data: [{ status: 'applied', runtime_version: expected + 1 }], error: null };
      }
      return { data: null, error: null };
    },
    claimCalls: () => claimCalls,
  };
  return client;
}

// currentIslandNumber 11 => 10 islands completed => journey level 5 (thresholds 2..5 unlocked).
const UNLOCKED_ISLAND_NUMBER = 11;

export const combinedJourneyRewardClaimActionTests: TestCase[] = [
  {
    name: 'returns disabled when the feature flag is off',
    run: async () => {
      resetEnvironment();
      await seedState({ currentIslandNumber: UNLOCKED_ISLAND_NUMBER, dicePool: 5 });
      const client = makeFakeClient();

      const result = await claimCombinedJourneyReward({
        session: makeSession(),
        client: client as never,
        thresholdLevel: 2,
      });

      assertEqual(result.status, 'disabled', 'flag off should disable claims');
      assertEqual(result.reward, null, 'disabled claim grants nothing');
      assertEqual(client.claimCalls(), 0, 'RPC should not be called when disabled');
      assertEqual(readIslandRunGameStateRecord(makeSession()).dicePool, 5, 'no dice granted while disabled');
    },
  },
  {
    name: 'returns disabled when no server client is available',
    run: async () => {
      resetEnvironment();
      __setIslandRunFeatureFlagsForTests({ combinedJourneyRewardsEnabled: true });
      await seedState({ currentIslandNumber: UNLOCKED_ISLAND_NUMBER });

      const result = await claimCombinedJourneyReward({
        session: makeSession(),
        client: null,
        thresholdLevel: 2,
      });

      assertEqual(result.status, 'disabled', 'null client cannot reach the idempotency RPC');
    },
  },
  {
    name: 'returns not_yet_unlocked for a threshold above the derived level',
    run: async () => {
      resetEnvironment();
      __setIslandRunFeatureFlagsForTests({ combinedJourneyRewardsEnabled: true });
      await seedState({ currentIslandNumber: UNLOCKED_ISLAND_NUMBER });
      const client = makeFakeClient();

      const result = await claimCombinedJourneyReward({
        session: makeSession(),
        client: client as never,
        thresholdLevel: 99,
      });

      assertEqual(result.status, 'not_yet_unlocked', 'cannot claim a chest above the current level');
      assertEqual(client.claimCalls(), 0, 'unlock guard should run before the RPC');
    },
  },
  {
    name: 'grants dice for an even threshold and persists the new pool',
    run: async () => {
      resetEnvironment();
      __setIslandRunFeatureFlagsForTests({ combinedJourneyRewardsEnabled: true });
      await seedState({ currentIslandNumber: UNLOCKED_ISLAND_NUMBER, dicePool: 7 });
      const client = makeFakeClient();

      const result = await claimCombinedJourneyReward({
        session: makeSession(),
        client: client as never,
        thresholdLevel: 2,
      });

      assertEqual(result.status, 'claimed', 'unlocked even threshold should claim');
      assertEqual(result.reward?.kind, 'dice', 'threshold 2 grants dice');
      assertEqual(result.reward?.amount, 10, 'threshold 2 grants 10 dice');
      assertEqual(readIslandRunGameStateRecord(makeSession()).dicePool, 17, 'dice pool should grow by the reward');
    },
  },
  {
    name: 'grants essence for an odd threshold and tracks lifetime earned',
    run: async () => {
      resetEnvironment();
      __setIslandRunFeatureFlagsForTests({ combinedJourneyRewardsEnabled: true });
      await seedState({ currentIslandNumber: UNLOCKED_ISLAND_NUMBER, essence: 4, essenceLifetimeEarned: 4 });
      const client = makeFakeClient();

      const result = await claimCombinedJourneyReward({
        session: makeSession(),
        client: client as never,
        thresholdLevel: 3,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'claimed', 'unlocked odd threshold should claim');
      assertEqual(result.reward?.kind, 'essence', 'threshold 3 grants essence');
      assertEqual(result.reward?.amount, 5, 'threshold 3 grants 5 essence');
      assertEqual(persisted.essence, 9, 'essence should grow by the reward');
      assertEqual(persisted.essenceLifetimeEarned, 9, 'lifetime essence should grow by the reward');
    },
  },
  {
    name: 'is idempotent: a second claim of the same threshold grants nothing',
    run: async () => {
      resetEnvironment();
      __setIslandRunFeatureFlagsForTests({ combinedJourneyRewardsEnabled: true });
      await seedState({ currentIslandNumber: UNLOCKED_ISLAND_NUMBER, dicePool: 0 });
      const client = makeFakeClient();

      const first = await claimCombinedJourneyReward({ session: makeSession(), client: client as never, thresholdLevel: 4 });
      const second = await claimCombinedJourneyReward({ session: makeSession(), client: client as never, thresholdLevel: 4 });
      const persisted = readIslandRunGameStateRecord(makeSession());

      assertEqual(first.status, 'claimed', 'first claim succeeds');
      assertEqual(second.status, 'already_claimed', 'second claim is idempotent');
      assertEqual(persisted.dicePool, 10, 'dice should only be granted once');
      assert(client.claimCalls() === 2, 'RPC consulted both times, but only the first granted');
    },
  },
];
