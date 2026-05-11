import { selectCreatureForEgg } from '../creatureCatalog';
import { openEggRewardInventoryEntry } from '../islandRunEggRewardInventoryAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  EGG_REWARD_RARITY_ROLL_DENOMINATOR,
  EGG_REWARD_RARITY_THRESHOLD,
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type EggRewardInventoryEntry,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { assert, assertDeepEqual, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

declare const process: { cwd: () => string };

const USER_ID = 'egg-reward-inventory-action-test-user';

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

async function seedState(overrides: Partial<IslandRunGameStateRecord>): Promise<void> {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: { ...base, ...overrides },
  });
  refreshIslandRunStateFromLocal(session);
}

function makeEggEntry(overrides: Partial<EggRewardInventoryEntry> = {}): EggRewardInventoryEntry {
  return {
    eggRewardId: 'treasure_path_egg:test:run:tile:reward',
    source: 'treasure_path',
    sourceSessionKey: '0:10',
    sourceRunId: 'run',
    sourceRewardId: 'reward',
    tileId: 7,
    cycleIndex: 0,
    targetIslandNumber: 10,
    eggTier: 'common',
    eggSeed: 12345,
    rarityRoll: 100,
    rarityRollDenominator: EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityThreshold: EGG_REWARD_RARITY_THRESHOLD,
    resolverVersion: 'treasure_path_egg_v1',
    status: 'unopened',
    grantedAtMs: 1000,
    openedAtMs: null,
    ...overrides,
  };
}

export const islandRunEggRewardInventoryActionTests: TestCase[] = [
  {
    name: 'openEggRewardInventoryEntry opens an unopened voucher, stores creature id, and grants canonical creature without hatchery mutation',
    run: async () => {
      resetEnvironment();
      const entry = makeEggEntry({ eggRewardId: 'egg-open-main', eggTier: 'rare', eggSeed: 24680, targetIslandNumber: 12 });
      const perIslandEggs = {
        '12': {
          tier: 'rare' as const,
          setAtMs: 111,
          hatchAtMs: 222,
          status: 'incubating' as const,
          location: 'island' as const,
        },
      };
      await seedState({
        runtimeVersion: 2,
        activeEggTier: 'common',
        activeEggSetAtMs: 333,
        activeEggHatchDurationMs: 444,
        activeEggIsDormant: true,
        perIslandEggs,
        eggRewardInventory: [entry],
        creatureCollection: [],
      });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: entry.eggRewardId,
        nowMs: 5000,
      });

      const expectedCreature = selectCreatureForEgg({
        eggTier: entry.eggTier,
        seed: entry.eggSeed,
        islandNumber: entry.targetIslandNumber,
      });
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'opened', 'Opening an unopened voucher should succeed');
      assertEqual(result.openedCreatureId, expectedCreature.id, 'Result should include deterministic creature id');
      assertEqual(persisted.eggRewardInventory[0]?.status, 'opened', 'Voucher should be marked opened');
      assertEqual(persisted.eggRewardInventory[0]?.openedAtMs, 5000, 'Voucher should store opened timestamp');
      assertEqual(persisted.eggRewardInventory[0]?.openedCreatureId, expectedCreature.id, 'Voucher should store opened creature id');
      assertEqual(persisted.creatureCollection.length, 1, 'Opening should add one canonical creature collection entry');
      assertEqual(persisted.creatureCollection[0]?.creatureId, expectedCreature.id, 'Collection should receive selected creature');
      assertEqual(persisted.creatureCollection[0]?.copies, 1, 'First collection should create one copy');
      assertEqual(persisted.creatureCollection[0]?.lastCollectedIslandNumber, entry.targetIslandNumber, 'Collection should track source island');
      assertEqual(persisted.activeEggTier, 'common', 'Opening voucher should not mutate activeEggTier');
      assertEqual(persisted.activeEggSetAtMs, 333, 'Opening voucher should not mutate activeEggSetAtMs');
      assertEqual(persisted.activeEggHatchDurationMs, 444, 'Opening voucher should not mutate activeEggHatchDurationMs');
      assertEqual(persisted.activeEggIsDormant, true, 'Opening voucher should not mutate activeEggIsDormant');
      assertDeepEqual(persisted.perIslandEggs, perIslandEggs, 'Opening voucher should not mutate perIslandEggs');
    },
  },
  {
    name: 'openEggRewardInventoryEntry repeated open is already_opened and does not duplicate creature',
    run: async () => {
      resetEnvironment();
      const entry = makeEggEntry({ eggRewardId: 'egg-repeat', eggSeed: 13579, targetIslandNumber: 9 });
      await seedState({ runtimeVersion: 0, eggRewardInventory: [entry], creatureCollection: [] });

      const first = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: entry.eggRewardId,
        nowMs: 6000,
      });
      const second = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: entry.eggRewardId,
        nowMs: 7000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(first.status, 'opened', 'First open should succeed');
      assertEqual(second.status, 'already_opened', 'Second open should be an idempotent no-op');
      assertEqual(second.openedCreatureId, first.openedCreatureId, 'Already-opened response should return existing creature id');
      assertEqual(persisted.creatureCollection.length, 1, 'Repeated open should not add a second collection entry');
      assertEqual(persisted.creatureCollection[0]?.copies, 1, 'Repeated open should not increment copies');
      assertEqual(persisted.eggRewardInventory[0]?.openedAtMs, 6000, 'Repeated open should preserve original opened timestamp');
    },
  },
  {
    name: 'openEggRewardInventoryEntry increments canonical copy count for duplicate creatures',
    run: async () => {
      resetEnvironment();
      const entry = makeEggEntry({ eggRewardId: 'egg-duplicate', eggTier: 'common', eggSeed: 222, targetIslandNumber: 3 });
      const creature = selectCreatureForEgg({ eggTier: entry.eggTier, seed: entry.eggSeed, islandNumber: entry.targetIslandNumber });
      await seedState({
        eggRewardInventory: [entry],
        creatureCollection: [{
          creatureId: creature.id,
          copies: 2,
          firstCollectedAtMs: 100,
          lastCollectedAtMs: 200,
          lastCollectedIslandNumber: 2,
          bondXp: 6,
          bondLevel: 3,
          lastFedAtMs: 250,
          claimedBondMilestones: [3],
        }],
      });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: entry.eggRewardId,
        nowMs: 8000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'opened', 'Duplicate creature voucher should still open');
      assertEqual(persisted.creatureCollection.length, 1, 'Duplicate creature should stay in one collection entry');
      assertEqual(persisted.creatureCollection[0]?.copies, 3, 'Duplicate creature should increment copy count');
      assertEqual(persisted.creatureCollection[0]?.bondXp, 6, 'Duplicate collection should preserve bond XP');
      assertEqual(persisted.creatureCollection[0]?.bondLevel, 3, 'Duplicate collection should preserve bond level');
      assertDeepEqual(persisted.creatureCollection[0]?.claimedBondMilestones, [3], 'Duplicate collection should preserve bond milestones');
      assertEqual(persisted.creatureCollection[0]?.lastCollectedAtMs, 8000, 'Duplicate collection should update latest collected timestamp');
      assertEqual(persisted.creatureCollection[0]?.lastCollectedIslandNumber, 3, 'Duplicate collection should update latest island');
    },
  },
  {
    name: 'openEggRewardInventoryEntry returns not_found for invalid eggRewardId',
    run: async () => {
      resetEnvironment();
      await seedState({ eggRewardInventory: [makeEggEntry({ eggRewardId: 'egg-present' })], creatureCollection: [] });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: 'missing-egg',
        nowMs: 9000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'not_found', 'Missing egg reward id should return not_found');
      assertEqual(result.openedCreatureId, null, 'Missing egg should not return a creature id');
      assertEqual(persisted.eggRewardInventory[0]?.status, 'unopened', 'Missing egg open should not mutate inventory');
      assertEqual(persisted.creatureCollection.length, 0, 'Missing egg open should not grant creatures');
    },
  },
  {
    name: 'openEggRewardInventoryEntry returns already_opened without granting when voucher is already opened',
    run: async () => {
      resetEnvironment();
      const entry = makeEggEntry({
        eggRewardId: 'egg-already-opened',
        status: 'opened',
        openedAtMs: 4000,
        openedCreatureId: 'common-sproutling',
      });
      await seedState({ runtimeVersion: 4, eggRewardInventory: [entry], creatureCollection: [] });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: entry.eggRewardId,
        nowMs: 10000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'already_opened', 'Already-opened voucher should no-op');
      assertEqual(result.openedCreatureId, 'common-sproutling', 'Already-opened voucher should return existing creature id');
      assertEqual(persisted.runtimeVersion, 4, 'Already-opened no-op should not commit a new runtime version');
      assertEqual(persisted.creatureCollection.length, 0, 'Already-opened no-op should not grant a duplicate creature');
      assertEqual(persisted.eggRewardInventory[0]?.openedAtMs, 4000, 'Already-opened no-op should preserve opened timestamp');
    },
  },
  {
    name: 'openEggRewardInventoryEntry is deterministic for identical seed tier and island',
    run: async () => {
      resetEnvironment();
      const first = makeEggEntry({ eggRewardId: 'egg-deterministic-a', eggTier: 'rare', eggSeed: 424242, targetIslandNumber: 15 });
      const second = makeEggEntry({ eggRewardId: 'egg-deterministic-b', eggTier: 'rare', eggSeed: 424242, targetIslandNumber: 15 });
      await seedState({ eggRewardInventory: [first, second], creatureCollection: [] });

      const firstResult = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: first.eggRewardId,
        nowMs: 11000,
      });
      const secondResult = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: second.eggRewardId,
        nowMs: 12000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(firstResult.openedCreatureId, secondResult.openedCreatureId, 'Same seed tier island should resolve same creature');
      assertEqual(persisted.creatureCollection.length, 1, 'Same deterministic creature should merge into one collection entry');
      assertEqual(persisted.creatureCollection[0]?.copies, 2, 'Opening two same deterministic creatures should increment copies');
    },
  },
  {
    name: 'openEggRewardInventoryEntry maps common and rare tiers through existing creature selection safely',
    run: async () => {
      resetEnvironment();
      const common = makeEggEntry({ eggRewardId: 'egg-common-safe', eggTier: 'common', eggSeed: 1, targetIslandNumber: 1 });
      const rare = makeEggEntry({ eggRewardId: 'egg-rare-safe', eggTier: 'rare', eggSeed: 2, targetIslandNumber: 1 });
      await seedState({ eggRewardInventory: [common, rare], creatureCollection: [] });

      const commonResult = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: common.eggRewardId,
        nowMs: 13000,
      });
      const rareResult = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: rare.eggRewardId,
        nowMs: 14000,
      });

      assertEqual(
        commonResult.openedCreatureId,
        selectCreatureForEgg({ eggTier: 'common', seed: common.eggSeed, islandNumber: common.targetIslandNumber }).id,
        'Common tier voucher should use common egg resolver',
      );
      assertEqual(
        rareResult.openedCreatureId,
        selectCreatureForEgg({ eggTier: 'rare', seed: rare.eggSeed, islandNumber: rare.targetIslandNumber }).id,
        'Rare tier voucher should use rare egg resolver',
      );
    },
  },
  {
    name: 'openEggRewardInventoryEntry does not use localStorage collection APIs',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      // @ts-ignore island-run test tsconfig omits node type libs
      const pathMod = await import('path');
      const actionSource = fsMod.readFileSync(
        pathMod.resolve(process.cwd(), 'src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts'),
        'utf8',
      );

      assert(!/\b(?:window\.)?localStorage\s*\./.test(actionSource), 'Egg reward inventory action should not directly use localStorage');
      assert(!/\bcollectCreatureForUser\b/.test(actionSource), 'Egg reward inventory action should not call localStorage creature collection API');
      assert(!/\bfetchCreatureCollection\b/.test(actionSource), 'Egg reward inventory action should not read localStorage creature collection API');
    },
  },
];
