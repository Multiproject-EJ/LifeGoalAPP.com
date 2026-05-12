import {
  collectPostRareTreasurePathAndTravel,
  resolvePostRareTreasurePathState,
  startPostRareTreasurePath,
} from '../islandRunPostRareTreasurePathAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  getIslandRunLuckyRollSessionKey,
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
  type IslandRunLuckyRollSession,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import {
  TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR,
  TREASURE_PATH_RARE_EGG_THRESHOLD,
} from '../islandRunTreasurePathEggReward';
import { assert, assertDeepEqual, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

declare const process: { cwd: () => string };

const USER_ID = 'post-rare-treasure-path-test-user';

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

function makeCompletedTreasurePathSession(options: {
  cycleIndex: number;
  targetIslandNumber: number;
  runId?: string;
}): IslandRunLuckyRollSession {
  const sessionKey = getIslandRunLuckyRollSessionKey(options.cycleIndex, options.targetIslandNumber);
  return {
    status: 'completed',
    runId: options.runId ?? `post-rare-treasure-path:${sessionKey}`,
    targetIslandNumber: options.targetIslandNumber,
    cycleIndex: options.cycleIndex,
    position: 29,
    rollsUsed: 6,
    claimedTileIds: [1, 2, 3, 4],
    pendingRewards: [
      { rewardId: `${sessionKey}:dice`, tileId: 1, rewardType: 'dice', amount: 5 },
      { rewardId: `${sessionKey}:essence`, tileId: 2, rewardType: 'essence', amount: 7 },
      { rewardId: `${sessionKey}:shards`, tileId: 3, rewardType: 'shards', amount: 11 },
      {
        rewardId: `${sessionKey}:egg`,
        tileId: 4,
        rewardType: 'egg',
        amount: 1,
        metadata: {
          eggTier: 'rare',
          eggSeed: 12345,
          rarityRoll: 1,
          rarityRollDenominator: TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR,
          rarityThreshold: TREASURE_PATH_RARE_EGG_THRESHOLD,
          resolverVersion: 'treasure_path_egg_v1',
        },
      },
    ],
    bankedRewards: [],
    startedAtMs: 1_000,
    bankedAtMs: null,
    updatedAtMs: 2_000,
  };
}

function makeBankedTreasurePathSession(options: {
  cycleIndex: number;
  targetIslandNumber: number;
  runId?: string;
}): IslandRunLuckyRollSession {
  const completed = makeCompletedTreasurePathSession(options);
  return {
    ...completed,
    status: 'banked',
    pendingRewards: [],
    bankedRewards: completed.pendingRewards,
    bankedAtMs: 3_000,
    updatedAtMs: 3_000,
  };
}

function seedCompletedTreasurePath(options: {
  cycleIndex: number;
  targetIslandNumber: number;
  state?: Partial<IslandRunGameStateRecord>;
}): string {
  const sessionKey = getIslandRunLuckyRollSessionKey(options.cycleIndex, options.targetIslandNumber);
  seedState({
    runtimeVersion: 10,
    currentIslandNumber: options.targetIslandNumber,
    cycleIndex: options.cycleIndex,
    dicePool: 20,
    essence: 30,
    essenceLifetimeEarned: 40,
    shards: 50,
    eggRewardInventory: [],
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {},
    luckyRollSessionsByMilestone: {
      [sessionKey]: makeCompletedTreasurePathSession({
        cycleIndex: options.cycleIndex,
        targetIslandNumber: options.targetIslandNumber,
      }),
    },
    ...(options.state ?? {}),
  });
  return sessionKey;
}

export const islandRunPostRareTreasurePathActionTests: TestCase[] = [
  {
    name: 'Treasure Path resolver returns not_applicable for non-milestone islands',
    run: () => {
      resetEnvironment();
      seedState({ currentIslandNumber: 1, cycleIndex: 0, luckyRollSessionsByMilestone: {} });
      const state = resolvePostRareTreasurePathState({
        record: readIslandRunGameStateRecord(makeSession()),
        completedIslandNumber: 1,
        cycleIndex: 0,
      });
      assertEqual(state.status, 'not_applicable', 'Non-milestone islands should not expose Treasure Path orchestration');
      assertEqual(state.sessionKey, null, 'Non-applicable islands should not produce a session key');
    },
  },
  {
    name: 'intro island 5 can start milestone Treasure Path',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 3, currentIslandNumber: 5, cycleIndex: 0, luckyRollSessionsByMilestone: {} });

      const started = await startPostRareTreasurePath({
        session: makeSession(),
        client: null,
        completedIslandNumber: 5,
        cycleIndex: 0,
        nowMs: 1_000,
        runId: 'intro-5-run',
      });

      assertEqual(started.status, 'started', 'Island 5 should create a Treasure Path session');
      assertEqual(started.state.status, 'active', 'Island 5 started session should resolve active');
      assertEqual(started.state.sessionKey, getIslandRunLuckyRollSessionKey(0, 5), 'Island 5 should use its milestone session key');
    },
  },
  {
    name: 'early island 20 can start milestone Treasure Path',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 3, currentIslandNumber: 20, cycleIndex: 0, luckyRollSessionsByMilestone: {} });

      const started = await startPostRareTreasurePath({
        session: makeSession(),
        client: null,
        completedIslandNumber: 20,
        cycleIndex: 0,
        nowMs: 1_000,
        runId: 'early-20-run',
      });

      assertEqual(started.status, 'started', 'Island 20 should create a Treasure Path session');
      assertEqual(started.state.status, 'active', 'Island 20 started session should resolve active');
      assertEqual(started.state.sessionKey, getIslandRunLuckyRollSessionKey(0, 20), 'Island 20 should use its milestone session key');
    },
  },
  {
    name: 'rare island 30 can start and resume post-rare Treasure Path',
    run: async () => {
      resetEnvironment();
      seedState({ runtimeVersion: 3, currentIslandNumber: 30, cycleIndex: 0, luckyRollSessionsByMilestone: {} });

      const started = await startPostRareTreasurePath({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        nowMs: 1_000,
        runId: 'rare-30-run',
      });
      const resumed = await startPostRareTreasurePath({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        nowMs: 2_000,
        runId: 'rare-30-second-run',
      });

      assertEqual(started.status, 'started', 'First call should create a Treasure Path session');
      assertEqual(started.state.status, 'active', 'Started session should resolve active');
      assertEqual(resumed.status, 'resumed', 'Second call should resume existing session');
      assertEqual(resumed.state.luckyRollSession?.runId, 'rare-30-run', 'Resume should preserve the original run id');
    },
  },
  {
    name: 'rare islands 30 60 90 and 120 are recognized as milestone Treasure Path islands',
    run: () => {
      resetEnvironment();
      for (const islandNumber of [30, 60, 90, 120]) {
        seedState({ currentIslandNumber: islandNumber, cycleIndex: 0, luckyRollSessionsByMilestone: {} });
        const state = resolvePostRareTreasurePathState({
          record: readIslandRunGameStateRecord(makeSession()),
          completedIslandNumber: islandNumber,
          cycleIndex: 0,
        });
        assertEqual(state.status, 'available_to_start', `Island ${islandNumber} should be available`);
        assert(state.sessionKey, `Island ${islandNumber} should resolve a session key`);
      }
    },
  },
  {
    name: 'island 10 is not a Treasure Path milestone island under current runtime logic',
    run: () => {
      resetEnvironment();
      seedState({ currentIslandNumber: 10, cycleIndex: 0, luckyRollSessionsByMilestone: {} });
      const state = resolvePostRareTreasurePathState({
        record: readIslandRunGameStateRecord(makeSession()),
        completedIslandNumber: 10,
        cycleIndex: 0,
      });
      assertEqual(state.status, 'not_applicable', 'Island 10 should not be Treasure Path eligible');
    },
  },
  {
    name: 'normal non-milestone islands are not Treasure Path eligible',
    run: () => {
      resetEnvironment();
      for (const islandNumber of [1, 11, 31, 61]) {
        seedState({ currentIslandNumber: islandNumber, cycleIndex: 0, luckyRollSessionsByMilestone: {} });
        const state = resolvePostRareTreasurePathState({
          record: readIslandRunGameStateRecord(makeSession()),
          completedIslandNumber: islandNumber,
          cycleIndex: 0,
        });
        assertEqual(state.status, 'not_applicable', `Island ${islandNumber} should not be Treasure Path eligible`);
      }
    },
  },
  {
    name: 'start resume is idempotent and does not mutate hatchery egg state',
    run: async () => {
      resetEnvironment();
      const perIslandEggs = {
        '30': {
          tier: 'rare' as const,
          setAtMs: 111,
          hatchAtMs: 222,
          status: 'incubating' as const,
          location: 'island' as const,
        },
      };
      seedState({
        runtimeVersion: 1,
        currentIslandNumber: 30,
        cycleIndex: 0,
        activeEggTier: 'common',
        activeEggSetAtMs: 100,
        activeEggHatchDurationMs: 200,
        activeEggIsDormant: true,
        perIslandEggs,
        luckyRollSessionsByMilestone: {},
      });

      await startPostRareTreasurePath({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        nowMs: 1_000,
      });
      await startPostRareTreasurePath({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        nowMs: 2_000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      const sessionKey = getIslandRunLuckyRollSessionKey(0, 30);
      assertEqual(Object.keys(persisted.luckyRollSessionsByMilestone).length, 1, 'Idempotent start should create one session');
      assertEqual(persisted.luckyRollSessionsByMilestone[sessionKey].startedAtMs, 1_000, 'Second start should not replace session');
      assertEqual(persisted.activeEggTier, 'common', 'Start should not mutate activeEggTier');
      assertEqual(persisted.activeEggSetAtMs, 100, 'Start should not mutate activeEggSetAtMs');
      assertEqual(persisted.activeEggHatchDurationMs, 200, 'Start should not mutate activeEggHatchDurationMs');
      assertEqual(persisted.activeEggIsDormant, true, 'Start should not mutate activeEggIsDormant');
      assertDeepEqual(persisted.perIslandEggs, perIslandEggs, 'Start should not mutate perIslandEggs');
    },
  },
  {
    name: 'completed post-rare Treasure Path can be collected and travels to next island',
    run: async () => {
      resetEnvironment();
      seedCompletedTreasurePath({ cycleIndex: 0, targetIslandNumber: 30 });

      const collected = await collectPostRareTreasurePathAndTravel({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        startTimer: true,
        nowMs: 5_000,
        getIslandDurationMs: () => 60_000,
        islandRunContractV2Enabled: false,
      });

      assertEqual(collected.status, 'banked_and_traveled', 'Collect should bank and travel');
      assertEqual(collected.state.status, 'already_traveled', 'Collected state should resolve already_traveled');
      assertEqual(collected.record.currentIslandNumber, 31, 'Collect should travel to the next island');
      assertEqual(collected.record.cycleIndex, 0, 'Cycle should not change before island 120');
      assertEqual(collected.record.islandStartedAtMs, 5_000, 'Travel should start timer when requested');
    },
  },
  {
    name: 'collect banks dice essence shards and eggs exactly once',
    run: async () => {
      resetEnvironment();
      const sessionKey = seedCompletedTreasurePath({ cycleIndex: 0, targetIslandNumber: 30 });

      const collected = await collectPostRareTreasurePathAndTravel({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        startTimer: true,
        nowMs: 5_000,
        getIslandDurationMs: () => 60_000,
        islandRunContractV2Enabled: false,
      });
      const repeated = await collectPostRareTreasurePathAndTravel({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        startTimer: true,
        nowMs: 6_000,
        getIslandDurationMs: () => 60_000,
        islandRunContractV2Enabled: false,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(collected.diceAwarded, 5, 'Collect should report dice banked');
      assertEqual(collected.essenceAwarded, 7, 'Collect should report essence banked');
      assertEqual(collected.shardsAwarded, 11, 'Collect should report shards banked');
      assertEqual(repeated.status, 'already_traveled', 'Repeated collect should no-op after travel');
      assertEqual(persisted.dicePool, 25, 'Dice should bank exactly once');
      assertEqual(persisted.essence, 37, 'Essence should bank exactly once');
      assertEqual(persisted.essenceLifetimeEarned, 47, 'Lifetime essence should bank exactly once');
      assertEqual(persisted.shards, 61, 'Shards should bank exactly once');
      assertEqual(persisted.eggRewardInventory.length, 1, 'Egg voucher should bank exactly once');
      assertEqual(persisted.eggRewardInventory[0].sourceSessionKey, sessionKey, 'Egg voucher should retain session key');
      assertEqual(persisted.luckyRollSessionsByMilestone[sessionKey].status, 'banked', 'Session should be banked');
      assertEqual(persisted.luckyRollSessionsByMilestone[sessionKey].pendingRewards.length, 0, 'Pending rewards should be cleared');
      assertEqual(persisted.luckyRollSessionsByMilestone[sessionKey].bankedRewards.length, 4, 'Banked rewards should be retained');
    },
  },
  {
    name: 'already banked post-rare Treasure Path still travels from completed rare island without rebanking',
    run: async () => {
      resetEnvironment();
      const sessionKey = getIslandRunLuckyRollSessionKey(0, 30);
      seedState({
        runtimeVersion: 10,
        currentIslandNumber: 30,
        cycleIndex: 0,
        dicePool: 20,
        essence: 30,
        essenceLifetimeEarned: 40,
        shards: 50,
        eggRewardInventory: [],
        luckyRollSessionsByMilestone: {
          [sessionKey]: makeBankedTreasurePathSession({ cycleIndex: 0, targetIslandNumber: 30 }),
        },
      });

      const collected = await collectPostRareTreasurePathAndTravel({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        startTimer: true,
        nowMs: 5_000,
        getIslandDurationMs: () => 60_000,
        islandRunContractV2Enabled: false,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(collected.status, 'banked_and_traveled', 'Already-banked session should still travel when still on completed rare island');
      assertEqual(collected.diceAwarded, 0, 'Already-banked travel should not report new dice');
      assertEqual(collected.essenceAwarded, 0, 'Already-banked travel should not report new essence');
      assertEqual(collected.shardsAwarded, 0, 'Already-banked travel should not report new shards');
      assertEqual(persisted.currentIslandNumber, 31, 'Already-banked collect should travel to next island');
      assertEqual(persisted.runtimeVersion, 11, 'Already-banked collect should commit travel exactly once');
      assertEqual(persisted.dicePool, 20, 'Already-banked collect should not duplicate dice');
      assertEqual(persisted.essence, 30, 'Already-banked collect should not duplicate essence');
      assertEqual(persisted.essenceLifetimeEarned, 40, 'Already-banked collect should not duplicate lifetime essence');
      assertEqual(persisted.shards, 50, 'Already-banked collect should not duplicate shards');
      assertEqual(persisted.eggRewardInventory.length, 0, 'Already-banked collect should not duplicate egg vouchers');
      assertEqual(persisted.luckyRollSessionsByMilestone[sessionKey].status, 'banked', 'Session should remain banked');
    },
  },
  {
    name: 'repeated collect does not duplicate rewards or travel incorrectly',
    run: async () => {
      resetEnvironment();
      seedCompletedTreasurePath({ cycleIndex: 0, targetIslandNumber: 30 });
      const first = await collectPostRareTreasurePathAndTravel({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        startTimer: false,
        nowMs: 5_000,
        getIslandDurationMs: () => 60_000,
        islandRunContractV2Enabled: false,
      });
      const afterFirstCollect = readIslandRunGameStateRecord(makeSession());
      const repeated = await collectPostRareTreasurePathAndTravel({
        session: makeSession(),
        client: null,
        completedIslandNumber: 30,
        cycleIndex: 0,
        startTimer: false,
        nowMs: 6_000,
        getIslandDurationMs: () => 60_000,
        islandRunContractV2Enabled: false,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(first.status, 'banked_and_traveled', 'First collect should bank and travel');
      assertEqual(repeated.status, 'already_traveled', 'Repeated collect should identify completed travel');
      assertEqual(repeated.record.runtimeVersion, afterFirstCollect.runtimeVersion, 'Repeated collect result should preserve runtimeVersion');
      assertEqual(persisted.currentIslandNumber, 31, 'Repeated collect should remain on the next island');
      assertEqual(persisted.runtimeVersion, afterFirstCollect.runtimeVersion, 'Repeated collect should not commit travel or bump runtimeVersion again');
      assertEqual(persisted.dicePool, 25, 'Repeated collect should not duplicate dice');
      assertEqual(persisted.eggRewardInventory.length, 1, 'Repeated collect should not duplicate egg vouchers');
    },
  },
  {
    name: 'island 120 collect travels to island 1 with cycle increment',
    run: async () => {
      resetEnvironment();
      seedCompletedTreasurePath({ cycleIndex: 0, targetIslandNumber: 120 });

      const collected = await collectPostRareTreasurePathAndTravel({
        session: makeSession(),
        client: null,
        completedIslandNumber: 120,
        cycleIndex: 0,
        startTimer: true,
        nowMs: 5_000,
        getIslandDurationMs: () => 60_000,
        islandRunContractV2Enabled: false,
      });

      assertEqual(collected.status, 'banked_and_traveled', 'Island 120 collect should succeed');
      assertEqual(collected.record.currentIslandNumber, 1, 'Island 120 should wrap to island 1');
      assertEqual(collected.record.cycleIndex, 1, 'Island 120 wrap should increment cycle');
      assertEqual(collected.state.status, 'already_traveled', 'Wrapped collect should resolve already traveled');
    },
  },
  {
    name: 'milestone Treasure Path orchestration does not add UI entry points',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      // @ts-ignore island-run test tsconfig omits node type libs
      const pathMod = await import('path');
      const serviceImportPattern = /islandRunPostRareTreasurePathAction/;
      const appSource = fsMod.readFileSync(pathMod.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
      const overlaySource = fsMod.readFileSync(pathMod.resolve(process.cwd(), 'src/components/GameBoardOverlay.tsx'), 'utf8');
      const debugPanelSource = fsMod.readFileSync(pathMod.resolve(
        process.cwd(),
        'src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx',
      ), 'utf8');
      const boardSource = fsMod.readFileSync(pathMod.resolve(
        process.cwd(),
        'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
      ), 'utf8');
      assert(!serviceImportPattern.test(appSource), 'App.tsx should not import milestone Treasure Path orchestration');
      assert(!serviceImportPattern.test(overlaySource), 'GameBoardOverlay should not import milestone Treasure Path orchestration');
      assert(
        /resolvePostRareTreasurePathState/.test(debugPanelSource),
        'Island Run debug panel should show milestone Treasure Path orchestration state',
      );
      assert(
        /startPostRareTreasurePath/.test(boardSource) && /collectPostRareTreasurePathAndTravel/.test(boardSource),
        'Island Run debug wiring should call milestone Treasure Path orchestration services',
      );
      assert(
        /getTreasurePathMilestoneMetadata\(stats\.islandNumber\)/.test(boardSource)
          && /island_clear_celebration_treasure_path_start/.test(boardSource)
          && /handleOpenPostRareTreasurePathOverlay\(stats\.islandNumber\)/.test(boardSource),
        'Island clear CTA should route eligible milestone islands through Treasure Path before travel',
      );
      assert(
        /performIslandTravel\(nextIsland, \{ startTimer: true \}\)/.test(boardSource),
        'Island clear CTA should preserve normal travel for non-milestone islands',
      );
      assert(
        /onCollectPostRareTreasurePathAndTravel=\{handlePostRareTreasurePathCollectAndTravel\}/.test(boardSource),
        'Milestone Treasure Path overlay should collect through collect+travel orchestration',
      );
      assert(
        !/LuckyRollBoard/.test(boardSource),
        'Island Run board milestone flow must not use legacy LuckyRollBoard',
      );
      assert(
        !/bankIslandRunLuckyRollRewards/.test(debugPanelSource) && !/resolveIslandRunTravelState/.test(debugPanelSource),
        'Debug panel must not compose milestone banking and travel directly',
      );
    },
  },
];
