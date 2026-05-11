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

function buildEggReward(overrides: Partial<EggRewardInventoryEntry> = {}): EggRewardInventoryEntry {
  return {
    eggRewardId: 'treasure_path_egg:test-session:test-run:3:reward-1',
    source: 'treasure_path',
    sourceSessionKey: '0:9',
    sourceRunId: 'test-run',
    sourceRewardId: 'reward-1',
    tileId: 3,
    cycleIndex: 0,
    targetIslandNumber: 9,
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
    name: 'opening unopened egg marks it opened and stores openedCreatureId',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward();
      seedState({ runtimeVersion: 4, eggRewardInventory: [egg], creatureCollection: [] });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: egg.eggRewardId,
        nowMs: 2000,
      });

      const expectedCreature = selectCreatureForEgg({
        eggTier: egg.eggTier,
        seed: egg.eggSeed,
        islandNumber: egg.targetIslandNumber,
      });
      assertEqual(result.status, 'opened', 'Expected unopened voucher to open');
      assertEqual(result.openedCreatureId, expectedCreature.id, 'Result should report opened creature');
      assertEqual(result.eggRewardInventoryEntry?.status, 'opened', 'Result entry should be opened');
      assertEqual(result.eggRewardInventoryEntry?.openedAtMs ?? null, 2000, 'Result entry should store openedAtMs');
      assertEqual(result.eggRewardInventoryEntry?.openedCreatureId ?? null, expectedCreature.id, 'Result entry should store openedCreatureId');
      assertEqual(result.record.runtimeVersion, 5, 'Opening should bump runtimeVersion');
    },
  },
  {
    name: 'opening unopened egg adds creature to canonical creatureCollection',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward({ targetIslandNumber: 12, eggSeed: 24680 });
      seedState({ eggRewardInventory: [egg], creatureCollection: [] });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: egg.eggRewardId,
        nowMs: 3000,
      });

      const expectedCreature = selectCreatureForEgg({
        eggTier: egg.eggTier,
        seed: egg.eggSeed,
        islandNumber: egg.targetIslandNumber,
      });
      const collectionEntry = result.record.creatureCollection[0];
      assertEqual(result.record.creatureCollection.length, 1, 'Expected one canonical collection entry');
      assertEqual(collectionEntry?.creatureId ?? null, expectedCreature.id, 'Collection should receive resolved creature');
      assertEqual(collectionEntry?.copies ?? 0, 1, 'First collected creature should have one copy');
      assertEqual(collectionEntry?.firstCollectedAtMs ?? 0, 3000, 'Collection should store first collected time');
      assertEqual(collectionEntry?.lastCollectedAtMs ?? 0, 3000, 'Collection should store latest collected time');
      assertEqual(collectionEntry?.lastCollectedIslandNumber ?? 0, 12, 'Collection should store target island number');
    },
  },
  {
    name: 'repeated open is no-op and does not duplicate creature',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward({ eggTier: 'rare', eggSeed: 13579 });
      seedState({ eggRewardInventory: [egg], creatureCollection: [] });

      const first = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: egg.eggRewardId,
        nowMs: 4000,
      });
      const second = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: egg.eggRewardId,
        nowMs: 5000,
      });

      assertEqual(first.status, 'opened', 'First open should succeed');
      assertEqual(second.status, 'already_opened', 'Repeated open should no-op as already opened');
      assertEqual(second.openedCreatureId, first.openedCreatureId, 'Repeated open should return existing creature id');
      assertEqual(second.record.creatureCollection.length, 1, 'Repeated open should not add another collection entry');
      assertEqual(second.record.creatureCollection[0]?.copies ?? 0, 1, 'Repeated open should not increment copies');
      assertEqual(second.eggRewardInventoryEntry?.openedAtMs ?? null, 4000, 'Repeated open should preserve original openedAtMs');
    },
  },
  {
    name: 'concurrent open calls serialize and grant only one creature copy',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward({ eggSeed: 98765 });
      seedState({ eggRewardInventory: [egg], creatureCollection: [] });

      const [first, second] = await Promise.all([
        openEggRewardInventoryEntry({ session: makeSession(), client: null, eggRewardId: egg.eggRewardId, nowMs: 6000 }),
        openEggRewardInventoryEntry({ session: makeSession(), client: null, eggRewardId: egg.eggRewardId, nowMs: 7000 }),
      ]);

      const statuses = [first.status, second.status].sort();
      const persisted = readIslandRunGameStateRecord(makeSession());
      assertDeepEqual(statuses, ['already_opened', 'opened'], 'Concurrent opens should contain one open and one already-opened no-op');
      assertEqual(persisted.creatureCollection.length, 1, 'Concurrent opens should persist one collection entry');
      assertEqual(persisted.creatureCollection[0]?.copies ?? 0, 1, 'Concurrent opens should grant one copy');
    },
  },
  {
    name: 'duplicate creature increments canonical copy count',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward({ targetIslandNumber: 9, eggSeed: 12345 });
      const creature = selectCreatureForEgg({
        eggTier: egg.eggTier,
        seed: egg.eggSeed,
        islandNumber: egg.targetIslandNumber,
      });
      seedState({
        eggRewardInventory: [egg],
        creatureCollection: [{
          creatureId: creature.id,
          copies: 2,
          firstCollectedAtMs: 100,
          lastCollectedAtMs: 500,
          lastCollectedIslandNumber: 4,
          bondXp: 6,
          bondLevel: 3,
          lastFedAtMs: 600,
          claimedBondMilestones: [3],
        }],
      });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: egg.eggRewardId,
        nowMs: 8000,
      });

      const collectionEntry = result.record.creatureCollection[0];
      assertEqual(collectionEntry?.creatureId ?? null, creature.id, 'Expected duplicate creature entry to remain canonical entry');
      assertEqual(collectionEntry?.copies ?? 0, 3, 'Duplicate creature should increment copies');
      assertEqual(collectionEntry?.firstCollectedAtMs ?? 0, 100, 'Duplicate should preserve first collected time');
      assertEqual(collectionEntry?.lastCollectedAtMs ?? 0, 8000, 'Duplicate should update latest collected time');
      assertEqual(collectionEntry?.lastCollectedIslandNumber ?? 0, 9, 'Duplicate should update latest island number');
      assertEqual(collectionEntry?.bondXp ?? 0, 6, 'Duplicate should preserve bond XP');
      assertEqual(collectionEntry?.bondLevel ?? 0, 3, 'Duplicate should preserve bond level');
      assertEqual(collectionEntry?.lastFedAtMs ?? null, 600, 'Duplicate should preserve feed state');
      assertDeepEqual(collectionEntry?.claimedBondMilestones ?? [], [3], 'Duplicate should preserve claimed milestones');
    },
  },
  {
    name: 'invalid eggRewardId returns not_found',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward();
      seedState({ runtimeVersion: 9, eggRewardInventory: [egg], creatureCollection: [] });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: 'missing-egg-reward',
        nowMs: 9000,
      });

      assertEqual(result.status, 'not_found', 'Missing voucher should return not_found');
      assertEqual(result.eggRewardInventoryEntry, null, 'Missing voucher should not return an entry');
      assertEqual(result.openedCreatureId, null, 'Missing voucher should not return a creature id');
      assertEqual(result.record.runtimeVersion, 9, 'Missing voucher should not mutate runtimeVersion');
      assertDeepEqual(result.record.eggRewardInventory, [egg], 'Missing voucher should not mutate inventory');
      assertDeepEqual(result.record.creatureCollection, [], 'Missing voucher should not mutate collection');
    },
  },
  {
    name: 'already opened egg returns already_opened',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward({
        status: 'opened',
        openedAtMs: 10000,
        openedCreatureId: 'common-sproutling',
      });
      seedState({ runtimeVersion: 10, eggRewardInventory: [egg], creatureCollection: [] });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: egg.eggRewardId,
        nowMs: 11000,
      });

      assertEqual(result.status, 'already_opened', 'Opened voucher should return already_opened');
      assertEqual(result.openedCreatureId, 'common-sproutling', 'Opened voucher should return existing creature id');
      assertEqual(result.record.runtimeVersion, 10, 'Opened voucher no-op should not bump runtimeVersion');
      assertDeepEqual(result.record.eggRewardInventory, [egg], 'Opened voucher no-op should not mutate inventory');
      assertDeepEqual(result.record.creatureCollection, [], 'Opened voucher no-op should not mutate collection');
    },
  },
  {
    name: 'opening Treasure Egg does not mutate activeEgg fields or perIslandEggs',
    run: async () => {
      resetEnvironment();
      const egg = buildEggReward();
      const perIslandEggs = {
        '9': {
          tier: 'rare' as const,
          setAtMs: 100,
          hatchAtMs: 200,
          status: 'incubating' as const,
          location: 'island' as const,
        },
      };
      seedState({
        activeEggTier: 'rare',
        activeEggSetAtMs: 100,
        activeEggHatchDurationMs: 200,
        activeEggIsDormant: true,
        perIslandEggs,
        eggRewardInventory: [egg],
        creatureCollection: [],
      });

      const result = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: egg.eggRewardId,
        nowMs: 12000,
      });

      assertEqual(result.record.activeEggTier, 'rare', 'Opening voucher should not mutate activeEggTier');
      assertEqual(result.record.activeEggSetAtMs, 100, 'Opening voucher should not mutate activeEggSetAtMs');
      assertEqual(result.record.activeEggHatchDurationMs, 200, 'Opening voucher should not mutate activeEggHatchDurationMs');
      assertEqual(result.record.activeEggIsDormant, true, 'Opening voucher should not mutate activeEggIsDormant');
      assertDeepEqual(result.record.perIslandEggs, perIslandEggs, 'Opening voucher should not mutate perIslandEggs');
    },
  },
  {
    name: 'Treasure Egg opening action does not use localStorage collection APIs',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      // @ts-ignore island-run test tsconfig omits node type libs
      const pathMod = await import('path');
      const actionSource = fsMod.readFileSync(
        pathMod.resolve(process.cwd(), 'src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts'),
        'utf8',
      );

      assert(!/\b(?:window\.)?localStorage\s*\./.test(actionSource), 'Opening action should not directly use localStorage');
      assert(!/\bcollectCreatureForUser\b/.test(actionSource), 'Opening action should not use localStorage collection API');
      assert(!/\bfetchCreatureCollection\b/.test(actionSource), 'Opening action should not read localStorage collection API');
    },
  },
  {
    name: 'deterministic same eggSeed gives same creature',
    run: async () => {
      resetEnvironment();
      const firstEgg = buildEggReward({
        eggRewardId: 'treasure_path_egg:first',
        sourceRewardId: 'reward-first',
        eggSeed: 424242,
        targetIslandNumber: 15,
      });
      const secondEgg = buildEggReward({
        eggRewardId: 'treasure_path_egg:second',
        sourceRewardId: 'reward-second',
        eggSeed: 424242,
        targetIslandNumber: 15,
      });
      seedState({ eggRewardInventory: [firstEgg, secondEgg], creatureCollection: [] });

      const first = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: firstEgg.eggRewardId,
        nowMs: 13000,
      });
      const second = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: secondEgg.eggRewardId,
        nowMs: 14000,
      });

      assertEqual(first.openedCreatureId, second.openedCreatureId, 'Same egg seed/tier/island should resolve same creature');
    },
  },
  {
    name: 'common and rare tiers map safely to existing creature selection',
    run: async () => {
      resetEnvironment();
      const commonEgg = buildEggReward({
        eggRewardId: 'treasure_path_egg:common',
        sourceRewardId: 'reward-common',
        eggTier: 'common',
        eggSeed: 11111,
      });
      const rareEgg = buildEggReward({
        eggRewardId: 'treasure_path_egg:rare',
        sourceRewardId: 'reward-rare',
        eggTier: 'rare',
        eggSeed: 22222,
      });
      seedState({ eggRewardInventory: [commonEgg, rareEgg], creatureCollection: [] });

      const commonResult = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: commonEgg.eggRewardId,
        nowMs: 15000,
      });
      const rareResult = await openEggRewardInventoryEntry({
        session: makeSession(),
        client: null,
        eggRewardId: rareEgg.eggRewardId,
        nowMs: 16000,
      });
      const commonCreature = selectCreatureForEgg({
        eggTier: 'common',
        seed: commonEgg.eggSeed,
        islandNumber: commonEgg.targetIslandNumber,
      });
      const rareCreature = selectCreatureForEgg({
        eggTier: 'rare',
        seed: rareEgg.eggSeed,
        islandNumber: rareEgg.targetIslandNumber,
      });

      assertEqual(commonResult.openedCreatureId, commonCreature.id, 'Common voucher should use common creature resolver');
      assertEqual(rareResult.openedCreatureId, rareCreature.id, 'Rare voucher should use rare creature resolver');
      assert(commonResult.record.creatureCollection.some((entry) => entry.creatureId === commonCreature.id), 'Common creature should be collected');
      assert(rareResult.record.creatureCollection.some((entry) => entry.creatureId === rareCreature.id), 'Rare creature should be collected');
    },
  },
];
