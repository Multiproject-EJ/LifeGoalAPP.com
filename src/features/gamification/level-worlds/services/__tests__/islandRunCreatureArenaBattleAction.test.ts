import { openEggRewardInventoryEntry } from '../islandRunEggRewardInventoryAction';
import {
  resolveIslandRunCreatureArenaBattleAction,
  startIslandRunCreatureArenaBattle,
} from '../islandRunCreatureArenaBattleAction';
import { getIslandRunBossReward } from '../islandRunBossReward';
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
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'creature-arena-action-test-user';

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
  installWindowWithStorage(createMemoryStorage());
}

async function seedIsland5(overrides: Partial<IslandRunGameStateRecord> = {}): Promise<void> {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const stopBuildStateByIndex = base.stopBuildStateByIndex.map((entry, index) => index === 4
    ? { ...entry, spentEssence: entry.requiredEssence, buildLevel: 3 }
    : entry);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 5,
      cycleIndex: 0,
      dicePool: 7,
      essence: 11,
      essenceLifetimeEarned: 20,
      spinTokens: 0,
      stopBuildStateByIndex,
      ...overrides,
    },
  });
  refreshIslandRunStateFromLocal(session);
}

export const islandRunCreatureArenaBattleActionTests: TestCase[] = [
  {
    name: 'start persists one canonical Island 005 battle and resumes it after hydration',
    run: async () => {
      resetEnvironment();
      await seedIsland5();
      const first = await startIslandRunCreatureArenaBattle({ session: makeSession(), client: null, islandNumber: 5 });
      assertEqual(first.status, 'started', 'first start should create the encounter');
      assertEqual(first.battle?.opponentCreatureId, 'rare-crown-drifter', 'Island 005 should use the implemented roster species');
      assertEqual(first.battle?.player.shieldCharges, 3, 'Island 005 starts with its three island-bound shields');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.bossState.arenaBattle?.turnNumber, 1, 'battle should survive canonical storage');

      __resetIslandRunStateStoreForTests();
      refreshIslandRunStateFromLocal(makeSession());
      const resumed = await startIslandRunCreatureArenaBattle({ session: makeSession(), client: null, islandNumber: 5 });
      assertEqual(resumed.status, 'resumed', 'an interrupted battle should resume rather than reset');
      assertEqual(resumed.battle?.rngState, first.battle?.rngState, 'resume keeps deterministic RNG state');
    },
  },
  {
    name: 'victory atomically banks one locked Crown Drifter egg and the standard boss payout',
    run: async () => {
      resetEnvironment();
      await seedIsland5();
      const started = await startIslandRunCreatureArenaBattle({ session: makeSession(), client: null, islandNumber: 5 });
      assert(started.battle, 'battle should exist');
      await writeIslandRunGameStateRecord({
        session: makeSession(),
        client: null,
        record: {
          ...started.record,
          bossState: {
            ...started.record.bossState,
            arenaBattle: {
              ...started.battle!,
              opponent: { ...started.battle!.opponent, hp: 1 },
            },
          },
        },
      });
      refreshIslandRunStateFromLocal(makeSession());

      const result = await resolveIslandRunCreatureArenaBattleAction({
        session: makeSession(),
        client: null,
        islandNumber: 5,
        action: 'quick_attack',
        nowMs: 5000,
      });
      const payout = getIslandRunBossReward(5);
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.battle?.phase, 'victory', 'lethal command should persist victory');
      assertEqual(persisted.bossTrialResolvedIslandNumber, 5, 'victory should resolve the canonical Boss marker');
      assertEqual(persisted.dicePool, 7 + payout.dice, 'standard boss dice should be committed in the same record');
      assertEqual(persisted.essence, 11 + payout.essence, 'standard boss essence should be committed in the same record');
      assertEqual(persisted.eggRewardInventory.length, 1, 'victory should bank exactly one egg');
      assertEqual(persisted.eggRewardInventory[0]?.source, 'creature_arena', 'egg should identify the arena source');
      assertEqual(persisted.eggRewardInventory[0]?.lockedCreatureId, 'rare-crown-drifter', 'egg should lock the defeated species');
      assertEqual(persisted.eggRewardInventory[0]?.resolverVersion, 'creature_arena_locked_v1', 'egg should use the non-rerolling resolver');

      const duplicate = await resolveIslandRunCreatureArenaBattleAction({
        session: makeSession(),
        client: null,
        islandNumber: 5,
        action: 'quick_attack',
        nowMs: 6000,
      });
      const afterDuplicate = readIslandRunGameStateRecord(makeSession());
      assertEqual(duplicate.status, 'rejected', 'terminal battle should reject duplicate callbacks');
      assertEqual(afterDuplicate.eggRewardInventory.length, 1, 'duplicate callback should not mint another egg');
      assertEqual(afterDuplicate.dicePool, 7 + payout.dice, 'duplicate callback should not repay Boss dice');
    },
  },
  {
    name: 'opening the arena egg always grants Crown Drifter instead of rerolling the generic rare pool',
    run: async () => {
      resetEnvironment();
      await seedIsland5();
      const started = await startIslandRunCreatureArenaBattle({ session: makeSession(), client: null, islandNumber: 5 });
      assert(started.battle, 'battle should exist');
      await writeIslandRunGameStateRecord({
        session: makeSession(),
        client: null,
        record: {
          ...started.record,
          bossState: {
            ...started.record.bossState,
            arenaBattle: { ...started.battle!, opponent: { ...started.battle!.opponent, hp: 1 } },
          },
        },
      });
      refreshIslandRunStateFromLocal(makeSession());
      const victory = await resolveIslandRunCreatureArenaBattleAction({
        session: makeSession(), client: null, islandNumber: 5, action: 'quick_attack', nowMs: 7000,
      });
      const eggRewardId = victory.rewardEgg?.eggRewardId;
      assert(eggRewardId, 'victory should return the banked egg id');
      const opened = await openEggRewardInventoryEntry({
        session: makeSession(), client: null, eggRewardId: eggRewardId!, nowMs: 8000,
      });
      assertEqual(opened.status, 'opened', 'locked arena egg should open normally');
      assertEqual(opened.openedCreatureId, 'rare-crown-drifter', 'arena egg must resolve to the stored species');
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(persisted.creatureCollection[0]?.creatureId, 'rare-crown-drifter', 'canonical collection should receive Crown Drifter');
    },
  },
];
