"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatureCollectionServiceTests = void 0;
const creatureCollectionService_1 = require("../creatureCollectionService");
const creatureCatalog_1 = require("../creatureCatalog");
const testHarness_1 = require("./testHarness");
const USER_ID = 'collection-test-user';
function resetStorage() {
    (0, testHarness_1.installWindowWithStorage)((0, testHarness_1.createMemoryStorage)());
}
exports.creatureCollectionServiceTests = [
    {
        name: 'collectCreatureForUser creates entry then increments copies for duplicates',
        run: () => {
            resetStorage();
            const creature = (0, creatureCatalog_1.selectCreatureForEgg)({ eggTier: 'common', seed: 100, islandNumber: 2 });
            (0, creatureCollectionService_1.collectCreatureForUser)({ userId: USER_ID, creature, islandNumber: 2, collectedAtMs: 1000 });
            (0, creatureCollectionService_1.collectCreatureForUser)({ userId: USER_ID, creature, islandNumber: 4, collectedAtMs: 2000 });
            const collection = (0, creatureCollectionService_1.fetchCreatureCollection)(USER_ID);
            (0, testHarness_1.assertEqual)(collection.length, 1, 'Expected one manifest entry for duplicate creature');
            (0, testHarness_1.assertEqual)(collection[0]?.copies ?? 0, 2, 'Expected duplicate collection to increment copies');
            (0, testHarness_1.assertEqual)(collection[0]?.lastCollectedIslandNumber ?? 0, 4, 'Expected latest island number to be retained');
        },
    },
    {
        name: 'feedCreatureForUser advances bond level and exposes milestone claims',
        run: () => {
            resetStorage();
            const creature = (0, creatureCatalog_1.selectCreatureForEgg)({ eggTier: 'rare', seed: 200, islandNumber: 5 });
            (0, creatureCollectionService_1.collectCreatureForUser)({ userId: USER_ID, creature, islandNumber: 5, collectedAtMs: 1500 });
            (0, creatureCollectionService_1.feedCreatureForUser)({ userId: USER_ID, creatureId: creature.id, fedAtMs: 2000, xpGain: 6 });
            const entry = (0, creatureCollectionService_1.fetchCreatureCollection)(USER_ID)[0];
            (0, testHarness_1.assert)(entry, 'Expected creature entry after feeding');
            (0, testHarness_1.assertEqual)(entry?.bondLevel ?? 0, 3, 'Expected 6 XP to reach bond level 3');
            (0, testHarness_1.assertDeepEqual)((0, creatureCollectionService_1.getUnclaimedBondMilestones)(entry), [3], 'Expected bond level 3 milestone to unlock');
            (0, creatureCollectionService_1.claimCreatureBondMilestoneForUser)({ userId: USER_ID, creatureId: creature.id, milestoneLevel: 3 });
            const claimedEntry = (0, creatureCollectionService_1.fetchCreatureCollection)(USER_ID)[0];
            (0, testHarness_1.assertDeepEqual)(claimedEntry?.claimedBondMilestones ?? [], [3], 'Expected claimed milestone to persist');
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
            };
            const first = (0, creatureCollectionService_1.migrateLegacyEggLedgerToCollection)({ userId: USER_ID, perIslandEggs: ledger });
            const second = (0, creatureCollectionService_1.migrateLegacyEggLedgerToCollection)({ userId: USER_ID, perIslandEggs: ledger });
            (0, testHarness_1.assertEqual)(first.didChange, true, 'Expected first migration to insert creature');
            (0, testHarness_1.assertEqual)(second.didChange, false, 'Expected second migration to detect existing creature');
            (0, testHarness_1.assertEqual)(first.collection.length, 1, 'Expected one migrated creature');
        },
    },
    {
        name: 'clearCreatureCollectionForUser empties the collection AND active companion',
        run: () => {
            resetStorage();
            const creature = (0, creatureCatalog_1.selectCreatureForEgg)({ eggTier: 'common', seed: 100, islandNumber: 2 });
            (0, creatureCollectionService_1.collectCreatureForUser)({ userId: USER_ID, creature, islandNumber: 2, collectedAtMs: 1000 });
            (0, creatureCollectionService_1.saveActiveCompanionId)(USER_ID, creature.id);
            (0, testHarness_1.assertEqual)((0, creatureCollectionService_1.fetchCreatureCollection)(USER_ID).length, 1, 'Expected creature seeded before clear');
            (0, testHarness_1.assertEqual)((0, creatureCollectionService_1.fetchActiveCompanionId)(USER_ID), creature.id, 'Expected active companion seeded before clear');
            (0, creatureCollectionService_1.clearCreatureCollectionForUser)(USER_ID);
            (0, testHarness_1.assertDeepEqual)((0, creatureCollectionService_1.fetchCreatureCollection)(USER_ID), [], 'Expected empty collection after clear');
            (0, testHarness_1.assertEqual)((0, creatureCollectionService_1.fetchActiveCompanionId)(USER_ID), null, 'Expected null active companion after clear');
        },
    },
];
