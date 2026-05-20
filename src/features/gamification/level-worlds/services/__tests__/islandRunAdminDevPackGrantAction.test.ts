import {
  grantAdminDevCreaturePack,
  DEV_DEMO_CREATURE_PACK_IDS,
} from '../islandRunAdminDevPackGrantAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  EGG_REWARD_RARITY_ROLL_DENOMINATOR,
  EGG_REWARD_RARITY_THRESHOLD,
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { assert, assertDeepEqual, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'admin-dev-pack-grant-action-test-user';

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

function totalCreatureCopies(record: Pick<IslandRunGameStateRecord, 'creatureCollection'>): number {
  return record.creatureCollection.reduce((sum, entry) => sum + entry.copies, 0);
}

export const islandRunAdminDevPackGrantActionTests: TestCase[] = [
  {
    name: 'grantAdminDevCreaturePack grants fixed creatures, bonuses, and idempotency markers through canonical state',
    run: async () => {
      resetEnvironment();
      await seedState({
        runtimeVersion: 4,
        currentIslandNumber: 3,
        dicePool: 10,
        essence: 20,
        essenceLifetimeEarned: 50,
        creatureCollection: [],
        eggRewardInventory: [],
      });

      const result = await grantAdminDevCreaturePack({
        session: makeSession(),
        client: null,
        grantId: 'DEV_DEMO_CREATURE_PACK_V1',
        grantSource: 'dev',
        allowGrant: true,
        creatureIds: [...DEV_DEMO_CREATURE_PACK_IDS],
        diceBonus: 15,
        essenceBonus: 25,
        nowMs: 1234,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'granted', 'Dev creature pack grant should succeed');
      assertEqual(result.grantId, 'dev_demo_creature_pack_v1', 'Grant id should normalize to lowercase');
      assertEqual(result.creatureCopiesGranted, DEV_DEMO_CREATURE_PACK_IDS.length, 'Result should report granted creature copies');
      assertEqual(persisted.runtimeVersion, 5, 'Grant should commit one runtime update');
      assertEqual(persisted.dicePool, 25, 'Grant should add optional dice bonus');
      assertEqual(persisted.essence, 45, 'Grant should add optional essence bonus');
      assertEqual(persisted.essenceLifetimeEarned, 75, 'Grant should track optional essence bonus as earned');
      assertEqual(totalCreatureCopies(persisted), DEV_DEMO_CREATURE_PACK_IDS.length, 'Grant should add fixed creature copies');
      assertDeepEqual(
        persisted.creatureCollection.map((entry) => entry.creatureId).sort(),
        [...DEV_DEMO_CREATURE_PACK_IDS].sort(),
        'Canonical creature collection should receive the requested fixed creatures',
      );
      for (const entry of persisted.creatureCollection) {
        assertDeepEqual(entry.grantIds, ['dev_demo_creature_pack_v1'], `Creature ${entry.creatureId} should carry the grant id marker`);
        assertEqual(entry.lastCollectedIslandNumber, 3, 'Granted creature should track current island as source island');
        assertEqual(entry.lastCollectedAtMs, 1234, 'Granted creature should track grant timestamp');
      }
      assertDeepEqual(persisted.eggRewardInventory, [], 'Creature-only pack should not add egg vouchers');
    },
  },
  {
    name: 'grantAdminDevCreaturePack repeated grant id is an idempotent no-op',
    run: async () => {
      resetEnvironment();
      await seedState({
        runtimeVersion: 0,
        dicePool: 2,
        essence: 3,
        creatureCollection: [],
      });

      const first = await grantAdminDevCreaturePack({
        session: makeSession(),
        client: null,
        grantId: 'repeat-pack',
        grantSource: 'dev',
        allowGrant: true,
        creatureIds: ['common-sproutling'],
        diceBonus: 5,
        essenceBonus: 7,
        nowMs: 1000,
      });
      const second = await grantAdminDevCreaturePack({
        session: makeSession(),
        client: null,
        grantId: 'repeat-pack',
        grantSource: 'dev',
        allowGrant: true,
        creatureIds: ['common-sproutling'],
        diceBonus: 5,
        essenceBonus: 7,
        nowMs: 2000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(first.status, 'granted', 'First grant should succeed');
      assertEqual(second.status, 'already_granted', 'Repeated grant id should be detected');
      assertEqual(persisted.runtimeVersion, 1, 'Repeated grant should not create another commit');
      assertEqual(persisted.dicePool, 7, 'Repeated grant should not add dice twice');
      assertEqual(persisted.essence, 10, 'Repeated grant should not add essence twice');
      assertEqual(persisted.creatureCollection[0]?.copies, 1, 'Repeated grant should not add creature copies twice');
      assertEqual(persisted.creatureCollection[0]?.lastCollectedAtMs, 1000, 'Repeated grant should preserve original collection timestamp');
    },
  },
  {
    name: 'grantAdminDevCreaturePack handles duplicate creature ids as canonical copy increments',
    run: async () => {
      resetEnvironment();
      await seedState({
        creatureCollection: [{
          creatureId: 'common-sproutling',
          copies: 2,
          firstCollectedAtMs: 100,
          lastCollectedAtMs: 200,
          lastCollectedIslandNumber: 1,
          bondXp: 6,
          bondLevel: 3,
          lastFedAtMs: 250,
          claimedBondMilestones: [3],
        }],
      });

      const result = await grantAdminDevCreaturePack({
        session: makeSession(),
        client: null,
        grantId: 'duplicate-creature-pack',
        grantSource: 'admin',
        allowGrant: true,
        creatureIds: ['common-sproutling', 'common-sproutling'],
        nowMs: 3000,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'granted', 'Duplicate creature pack should still grant');
      assertEqual(persisted.creatureCollection.length, 1, 'Duplicate creature should remain one collection entry');
      assertEqual(persisted.creatureCollection[0]?.copies, 4, 'Duplicate creature ids should increment copies');
      assertEqual(persisted.creatureCollection[0]?.bondXp, 6, 'Duplicate grant should preserve bond XP');
      assertEqual(persisted.creatureCollection[0]?.bondLevel, 3, 'Duplicate grant should preserve bond level');
      assertDeepEqual(persisted.creatureCollection[0]?.claimedBondMilestones, [3], 'Duplicate grant should preserve bond milestones');
      assertDeepEqual(persisted.creatureCollection[0]?.grantIds, ['duplicate-creature-pack'], 'Duplicate grant should add grant marker once');
    },
  },
  {
    name: 'grantAdminDevCreaturePack grants fixed egg reward pack vouchers without opening them',
    run: async () => {
      resetEnvironment();
      await seedState({
        runtimeVersion: 8,
        currentIslandNumber: 12,
        cycleIndex: 2,
        creatureCollection: [],
        eggRewardInventory: [],
      });

      const result = await grantAdminDevCreaturePack({
        session: makeSession(),
        client: null,
        grantId: 'egg-pack-demo',
        grantSource: 'dev',
        allowGrant: true,
        eggRewards: [
          { eggTier: 'common' },
          { eggTier: 'rare', targetIslandNumber: 30 },
        ],
        nowMs: 4444,
      });

      const persisted = readIslandRunGameStateRecord(makeSession());
      assertEqual(result.status, 'granted', 'Egg pack grant should succeed');
      assertEqual(result.eggRewardsGranted, 2, 'Result should report two egg vouchers');
      assertEqual(persisted.runtimeVersion, 9, 'Egg pack grant should commit one runtime update');
      assertEqual(persisted.creatureCollection.length, 0, 'Egg reward pack should not grant creatures until vouchers are opened');
      assertEqual(persisted.eggRewardInventory.length, 2, 'Egg reward pack should add unopened vouchers');
      assertEqual(persisted.eggRewardInventory[0]?.eggRewardId, 'admin_dev_pack:egg-pack-demo:egg:1', 'First voucher id should include grant id');
      assertEqual(persisted.eggRewardInventory[0]?.source, 'treasure_path', 'Voucher should use existing egg reward inventory source for compatibility');
      assertEqual(persisted.eggRewardInventory[0]?.sourceSessionKey, 'admin_dev_pack:egg-pack-demo', 'Voucher should carry grant id in source session key');
      assertEqual(persisted.eggRewardInventory[0]?.eggTier, 'common', 'First voucher should use fixed requested tier');
      assertEqual(persisted.eggRewardInventory[0]?.targetIslandNumber, 12, 'Default voucher island should be current island');
      assertEqual(persisted.eggRewardInventory[0]?.status, 'unopened', 'Granted voucher should stay unopened');
      assertEqual(persisted.eggRewardInventory[0]?.grantedAtMs, 4444, 'Voucher should track grant timestamp');
      assertEqual(persisted.eggRewardInventory[0]?.rarityRollDenominator, EGG_REWARD_RARITY_ROLL_DENOMINATOR, 'Voucher should preserve existing denominator contract');
      assertEqual(persisted.eggRewardInventory[0]?.rarityThreshold, EGG_REWARD_RARITY_THRESHOLD, 'Voucher should preserve existing threshold contract');
      assertEqual(persisted.eggRewardInventory[1]?.eggTier, 'rare', 'Second voucher should use fixed requested tier');
      assertEqual(persisted.eggRewardInventory[1]?.targetIslandNumber, 30, 'Second voucher should preserve requested target island');
    },
  },
  {
    name: 'grantAdminDevCreaturePack rejects unauthorized and invalid requests without mutation',
    run: async () => {
      const cases: Array<{
        name: string;
        options: Parameters<typeof grantAdminDevCreaturePack>[0];
        status: 'unauthorized' | 'invalid_request';
        failureReason: string;
      }> = [
        {
          name: 'not gated',
          status: 'unauthorized',
          failureReason: 'grant_requires_dev_or_admin_gate',
          options: {
            session: makeSession(),
            client: null,
            grantId: 'blocked-pack',
            grantSource: 'dev',
            allowGrant: false,
            creatureIds: ['common-sproutling'],
          },
        },
        {
          name: 'unknown creature',
          status: 'invalid_request',
          failureReason: 'unknown_creature_id:not-a-creature',
          options: {
            session: makeSession(),
            client: null,
            grantId: 'invalid-creature-pack',
            grantSource: 'dev',
            allowGrant: true,
            creatureIds: ['not-a-creature'],
          },
        },
        {
          name: 'bonus only',
          status: 'invalid_request',
          failureReason: 'grant_must_include_creatures_or_egg_rewards',
          options: {
            session: makeSession(),
            client: null,
            grantId: 'bonus-only-pack',
            grantSource: 'dev',
            allowGrant: true,
            diceBonus: 5,
            essenceBonus: 5,
          },
        },
      ];

      for (const testCase of cases) {
        resetEnvironment();
        await seedState({
          runtimeVersion: 11,
          dicePool: 1,
          essence: 2,
          creatureCollection: [],
          eggRewardInventory: [],
        });

        const result = await grantAdminDevCreaturePack(testCase.options);
        const persisted = readIslandRunGameStateRecord(makeSession());
        assertEqual(result.status, testCase.status, `${testCase.name}: status should match`);
        assertEqual(result.failureReason, testCase.failureReason, `${testCase.name}: failure reason should match`);
        assertEqual(persisted.runtimeVersion, 11, `${testCase.name}: rejected request should not commit`);
        assertEqual(persisted.dicePool, 1, `${testCase.name}: rejected request should not grant dice`);
        assertEqual(persisted.essence, 2, `${testCase.name}: rejected request should not grant essence`);
        assertEqual(persisted.creatureCollection.length, 0, `${testCase.name}: rejected request should not grant creatures`);
        assertEqual(persisted.eggRewardInventory.length, 0, `${testCase.name}: rejected request should not grant eggs`);
      }
    },
  },
];
