"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatureCatalogTests = void 0;
const creatureCatalog_1 = require("../creatureCatalog");
const testHarness_1 = require("./testHarness");
exports.creatureCatalogTests = [
    {
        name: 'selectCreatureForEgg is deterministic for identical inputs',
        run: () => {
            const first = (0, creatureCatalog_1.selectCreatureForEgg)({ eggTier: 'rare', seed: 12345, islandNumber: 8 });
            const second = (0, creatureCatalog_1.selectCreatureForEgg)({ eggTier: 'rare', seed: 12345, islandNumber: 8 });
            (0, testHarness_1.assertEqual)(first.id, second.id, 'Expected deterministic creature selection');
        },
    },
    {
        name: 'guardian-style affinities grant essence companion bonuses that scale every 5 bond levels',
        run: () => {
            const creature = (0, creatureCatalog_1.selectCreatureForEgg)({ eggTier: 'common', seed: 12345, islandNumber: 1 });
            const bonus = (0, creatureCatalog_1.getCompanionBonusForCreature)({ ...creature, affinity: 'Guardian' }, 6);
            (0, testHarness_1.assertEqual)(bonus.effect, 'bonus_essence', 'Expected guardian affinity to grant essence');
            (0, testHarness_1.assertEqual)(bonus.amount, 10, 'Expected bonus to scale at bond level 6 (2 * 5 essence)');
            (0, testHarness_1.assertEqual)(bonus.nextBondMilestoneLevel, 11, 'Expected next essence milestone at level 11');
        },
    },
    {
        name: 'builder-style affinities grant sell bonus specialties',
        run: () => {
            const creature = (0, creatureCatalog_1.selectCreatureForEgg)({ eggTier: 'common', seed: 67890, islandNumber: 3 });
            const specialty = (0, creatureCatalog_1.getCreatureSpecialtyForCompanion)({ ...creature, affinity: 'Builder' }, 5);
            (0, testHarness_1.assertEqual)(specialty.effect, 'sell_bonus_essence', 'Expected builder affinity to boost sell rewards');
            (0, testHarness_1.assert)(specialty.amount >= 20, 'Expected builder specialty amount to scale upward');
        },
    },
    {
        name: 'all 45 creatures have an explicit shipZone metadata value',
        run: () => {
            (0, testHarness_1.assertEqual)(creatureCatalog_1.CREATURE_CATALOG.length, 45, 'Expected full 45-creature catalog');
            creatureCatalog_1.CREATURE_CATALOG.forEach((creature) => {
                (0, testHarness_1.assert)(creature.shipZone === 'zen' || creature.shipZone === 'energy' || creature.shipZone === 'cosmic', `Expected shipZone for ${creature.id}`);
            });
        },
    },
    {
        name: 'ship zone fallback resolver maps known habitats to deterministic zones',
        run: () => {
            (0, testHarness_1.assertEqual)((0, creatureCatalog_1.resolveShipZoneFromHabitat)('Zen Garden'), 'zen', 'Expected zen habitat mapping');
            (0, testHarness_1.assertEqual)((0, creatureCatalog_1.resolveShipZoneFromHabitat)('Sky Foundry'), 'energy', 'Expected energy habitat mapping');
            (0, testHarness_1.assertEqual)((0, creatureCatalog_1.resolveShipZoneFromHabitat)('Astral Dome'), 'cosmic', 'Expected cosmic habitat mapping');
            (0, testHarness_1.assertEqual)((0, creatureCatalog_1.resolveShipZoneFromHabitat)('Unknown Habitat'), 'zen', 'Unknown habitat should fallback to zen');
            const creature = creatureCatalog_1.CREATURE_CATALOG[0];
            (0, testHarness_1.assertEqual)((0, creatureCatalog_1.resolveShipZoneForCreature)(creature), creature.shipZone, 'Expected resolver to honor explicit shipZone metadata');
        },
    },
];
