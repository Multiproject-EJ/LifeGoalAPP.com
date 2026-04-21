"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatureFitEngineTests = void 0;
const creatureCatalog_1 = require("../creatureCatalog");
const creatureFitEngine_1 = require("../creatureFitEngine");
const testHarness_1 = require("./testHarness");
const sampleContext = {
    dominantArchetypeIds: ['visionary', 'explorer'],
    secondaryArchetypeIds: ['guardian'],
    supportArchetypeIds: ['architect'],
    weaknessTags: ['stress_fragility', 'decision_confusion'],
    preferredShipZones: ['cosmic'],
};
exports.creatureFitEngineTests = [
    {
        name: 'computeCreatureFitScore returns bounded weighted score and reason fields',
        run: () => {
            const creature = creatureCatalog_1.CREATURE_CATALOG.find((entry) => entry.id === 'rare-nebula-wisp');
            (0, testHarness_1.assert)(Boolean(creature), 'Expected fixture creature rare-nebula-wisp');
            const result = (0, creatureFitEngine_1.computeCreatureFitScore)(creature, sampleContext, creatureFitEngine_1.DEFAULT_CREATURE_FIT_CONFIG);
            (0, testHarness_1.assert)(result.score >= 0 && result.score <= 100, 'Expected bounded score range');
            (0, testHarness_1.assert)(Array.isArray(result.matchedArchetypes), 'Expected matched archetypes array');
            (0, testHarness_1.assert)(Array.isArray(result.matchedWeaknessTags), 'Expected matched weakness tags array');
            (0, testHarness_1.assertEqual)(result.creatureId, 'rare-nebula-wisp', 'Expected score result to reference scored creature id');
        },
    },
    {
        name: 'rankCreatureFitsForPlayer sorts descending and deterministic by id tie-break',
        run: () => {
            const rankedFirst = (0, creatureFitEngine_1.rankCreatureFitsForPlayer)(creatureCatalog_1.CREATURE_CATALOG, sampleContext);
            const rankedSecond = (0, creatureFitEngine_1.rankCreatureFitsForPlayer)(creatureCatalog_1.CREATURE_CATALOG, sampleContext);
            (0, testHarness_1.assertEqual)(rankedFirst.length, 45, 'Expected ranking for all catalog creatures');
            (0, testHarness_1.assertDeepEqual)(rankedFirst.map((entry) => entry.creatureId), rankedSecond.map((entry) => entry.creatureId), 'Expected deterministic ranking order for identical inputs');
            for (let i = 1; i < rankedFirst.length; i += 1) {
                (0, testHarness_1.assert)(rankedFirst[i - 1].score >= rankedFirst[i].score, 'Expected descending score order across ranking results');
            }
        },
    },
    {
        name: 'selectPerfectCompanions enforces max 3, determinism, and unique picks',
        run: () => {
            const ranked = (0, creatureFitEngine_1.rankCreatureFitsForPlayer)(creatureCatalog_1.CREATURE_CATALOG, sampleContext);
            const seedContext = { userId: 'user-123', cycleIndex: 2, islandNumber: 17 };
            const first = (0, creatureFitEngine_1.selectPerfectCompanions)(ranked, 3, seedContext);
            const second = (0, creatureFitEngine_1.selectPerfectCompanions)(ranked, 3, seedContext);
            (0, testHarness_1.assertEqual)(first.length, 3, 'Expected max 3 perfect companions');
            (0, testHarness_1.assertDeepEqual)(first, second, 'Expected deterministic perfect companion selection');
            const uniqueIds = new Set(first.map((entry) => entry.creatureId));
            (0, testHarness_1.assertEqual)(uniqueIds.size, first.length, 'Expected unique companion picks');
        },
    },
    {
        name: 'selectPerfectCompanions clamps invalid maxCount into safe range',
        run: () => {
            const ranked = (0, creatureFitEngine_1.rankCreatureFitsForPlayer)(creatureCatalog_1.CREATURE_CATALOG, sampleContext);
            const seedContext = { userId: 'user-123', cycleIndex: 2, islandNumber: 17 };
            const low = (0, creatureFitEngine_1.selectPerfectCompanions)(ranked, 0, seedContext);
            const high = (0, creatureFitEngine_1.selectPerfectCompanions)(ranked, 99, seedContext);
            (0, testHarness_1.assertEqual)(low.length, 0, 'Expected non-positive maxCount to produce empty selection');
            (0, testHarness_1.assertEqual)(high.length, 3, 'Expected maxCount to clamp at 3 companions');
        },
    },
];
