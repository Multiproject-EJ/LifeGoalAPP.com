import { clearCreatureTreatInventoryForUser, earnCreatureTreatsForUser, fetchCreatureTreatInventory, spendCreatureTreatForUser } from '../creatureTreatInventoryService';
import { assertDeepEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'treat-test-user';

function resetStorage(initial: Record<string, string> = {}): void {
  installWindowWithStorage(createMemoryStorage(initial));
}

export const creatureTreatInventoryServiceTests: TestCase[] = [
  {
    name: 'fetchCreatureTreatInventory returns defaults for first-time users',
    run: () => {
      resetStorage();
      assertDeepEqual(fetchCreatureTreatInventory(USER_ID), { basic: 3, favorite: 1, rare: 0 }, 'Expected default treat inventory');
    },
  },
  {
    name: 'earnCreatureTreatsForUser increments persisted inventory by type',
    run: () => {
      resetStorage();
      earnCreatureTreatsForUser(USER_ID, { basic: 2, rare: 1 });
      assertDeepEqual(fetchCreatureTreatInventory(USER_ID), { basic: 5, favorite: 1, rare: 1 }, 'Expected earned treats to persist');
    },
  },
  {
    name: 'spendCreatureTreatForUser never drops inventory below zero',
    run: () => {
      resetStorage();
      spendCreatureTreatForUser(USER_ID, 'rare');
      assertDeepEqual(fetchCreatureTreatInventory(USER_ID), { basic: 3, favorite: 1, rare: 0 }, 'Expected overspend to be ignored');
    },
  },
  {
    name: 'clearCreatureTreatInventoryForUser resets storage to defaults on next read',
    run: () => {
      resetStorage();
      earnCreatureTreatsForUser(USER_ID, { basic: 5, favorite: 4, rare: 2 });
      assertDeepEqual(fetchCreatureTreatInventory(USER_ID), { basic: 8, favorite: 5, rare: 2 }, 'Expected earned treats to persist before clear');

      clearCreatureTreatInventoryForUser(USER_ID);

      assertDeepEqual(
        fetchCreatureTreatInventory(USER_ID),
        { basic: 3, favorite: 1, rare: 0 },
        'Expected defaults after clearing the persisted treat inventory',
      );
    },
  },
];
