import {
  claimCreatureBondMilestoneForUser,
  collectCreatureForUser,
  fetchCreatureCollection,
  feedCreatureForUser,
  getUnclaimedBondMilestones,
  migrateLegacyEggLedgerToCollection,
} from '../creatureCollectionService';
import { selectCreatureForEgg } from '../creatureCatalog';
import { assert, assertDeepEqual, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'collection-test-user';

function resetStorage(): void {
  installWindowWithStorage(createMemoryStorage());
}

export const creatureCollectionServiceTests: TestCase[] = [
  {
    name: 'collectCreatureForUser creates entry then increments copies for duplicates',
    run: () => {
      resetStorage();
      const creature = selectCreatureForEgg({ eggTier: 'common', seed: 100, islandNumber: 2 });
      collectCreatureForUser({ userId: USER_ID, creature, islandNumber: 2, collectedAtMs: 1000 });
      collectCreatureForUser({ userId: USER_ID, creature, islandNumber: 4, collectedAtMs: 2000 });
      const collection = fetchCreatureCollection(USER_ID);
      assertEqual(collection.length, 1, 'Expected one manifest entry for duplicate creature');
      assertEqual(collection[0]?.copies ?? 0, 2, 'Expected duplicate collection to increment copies');
      assertEqual(collection[0]?.lastCollectedIslandNumber ?? 0, 4, 'Expected latest island number to be retained');
    },
  },
  {
    name: 'feedCreatureForUser advances bond level and exposes milestone claims',
    run: () => {
      resetStorage();
      const creature = selectCreatureForEgg({ eggTier: 'rare', seed: 200, islandNumber: 5 });
      collectCreatureForUser({ userId: USER_ID, creature, islandNumber: 5, collectedAtMs: 1500 });
      feedCreatureForUser({ userId: USER_ID, creatureId: creature.id, fedAtMs: 2000, xpGain: 6 });
      const entry = fetchCreatureCollection(USER_ID)[0];
      assert(entry, 'Expected creature entry after feeding');
      assertEqual(entry?.bondLevel ?? 0, 3, 'Expected 6 XP to reach bond level 3');
      assertDeepEqual(getUnclaimedBondMilestones(entry!), [3], 'Expected bond level 3 milestone to unlock');
      claimCreatureBondMilestoneForUser({ userId: USER_ID, creatureId: creature.id, milestoneLevel: 3 });
      const claimedEntry = fetchCreatureCollection(USER_ID)[0];
      assertDeepEqual(claimedEntry?.claimedBondMilestones ?? [], [3], 'Expected claimed milestone to persist');
    },
  },
  {
    name: 'migrateLegacyEggLedgerToCollection backfills missing collected creatures only once',
    run: () => {
      resetStorage();
      const ledger = {
        '7': {
          tier: 'mythic',
          setAtMs: 777,
          hatchAtMs: 888,
          status: 'collected',
          openedAt: 999,
          location: 'island',
        },
      } as const;
      const first = migrateLegacyEggLedgerToCollection({ userId: USER_ID, perIslandEggs: ledger });
      const second = migrateLegacyEggLedgerToCollection({ userId: USER_ID, perIslandEggs: ledger });
      assertEqual(first.didChange, true, 'Expected first migration to insert creature');
      assertEqual(second.didChange, false, 'Expected second migration to detect existing creature');
      assertEqual(first.collection.length, 1, 'Expected one migrated creature');
    },
  },
];
