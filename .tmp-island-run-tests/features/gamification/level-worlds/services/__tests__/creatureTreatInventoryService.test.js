"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatureTreatInventoryServiceTests = void 0;
const creatureTreatInventoryService_1 = require("../creatureTreatInventoryService");
const testHarness_1 = require("./testHarness");
const USER_ID = 'treat-test-user';
function resetStorage(initial = {}) {
    (0, testHarness_1.installWindowWithStorage)((0, testHarness_1.createMemoryStorage)(initial));
}
exports.creatureTreatInventoryServiceTests = [
    {
        name: 'fetchCreatureTreatInventory returns defaults for first-time users',
        run: () => {
            resetStorage();
            (0, testHarness_1.assertDeepEqual)((0, creatureTreatInventoryService_1.fetchCreatureTreatInventory)(USER_ID), { basic: 3, favorite: 1, rare: 0 }, 'Expected default treat inventory');
        },
    },
    {
        name: 'earnCreatureTreatsForUser increments persisted inventory by type',
        run: () => {
            resetStorage();
            (0, creatureTreatInventoryService_1.earnCreatureTreatsForUser)(USER_ID, { basic: 2, rare: 1 });
            (0, testHarness_1.assertDeepEqual)((0, creatureTreatInventoryService_1.fetchCreatureTreatInventory)(USER_ID), { basic: 5, favorite: 1, rare: 1 }, 'Expected earned treats to persist');
        },
    },
    {
        name: 'spendCreatureTreatForUser never drops inventory below zero',
        run: () => {
            resetStorage();
            (0, creatureTreatInventoryService_1.spendCreatureTreatForUser)(USER_ID, 'rare');
            (0, testHarness_1.assertDeepEqual)((0, creatureTreatInventoryService_1.fetchCreatureTreatInventory)(USER_ID), { basic: 3, favorite: 1, rare: 0 }, 'Expected overspend to be ignored');
        },
    },
    {
        name: 'clearCreatureTreatInventoryForUser resets storage to defaults on next read',
        run: () => {
            resetStorage();
            (0, creatureTreatInventoryService_1.earnCreatureTreatsForUser)(USER_ID, { basic: 5, favorite: 4, rare: 2 });
            (0, testHarness_1.assertDeepEqual)((0, creatureTreatInventoryService_1.fetchCreatureTreatInventory)(USER_ID), { basic: 8, favorite: 5, rare: 2 }, 'Expected earned treats to persist before clear');
            (0, creatureTreatInventoryService_1.clearCreatureTreatInventoryForUser)(USER_ID);
            (0, testHarness_1.assertDeepEqual)((0, creatureTreatInventoryService_1.fetchCreatureTreatInventory)(USER_ID), { basic: 3, favorite: 1, rare: 0 }, 'Expected defaults after clearing the persisted treat inventory');
        },
    },
];
