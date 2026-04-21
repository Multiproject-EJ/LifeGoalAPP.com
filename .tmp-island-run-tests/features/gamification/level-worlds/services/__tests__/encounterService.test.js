"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encounterServiceTests = void 0;
const encounterService_1 = require("../encounterService");
const testHarness_1 = require("./testHarness");
exports.encounterServiceTests = [
    {
        name: 'drawEncounterChallengeForBucket is deterministic for the same island tile bucket',
        run: () => {
            const first = (0, encounterService_1.drawEncounterChallengeForBucket)({ islandNumber: 12, tileIndex: 6, timeBucket: 12345 });
            const second = (0, encounterService_1.drawEncounterChallengeForBucket)({ islandNumber: 12, tileIndex: 6, timeBucket: 12345 });
            (0, testHarness_1.assertEqual)(JSON.stringify(first), JSON.stringify(second), 'Expected deterministic encounter challenge selection');
        },
    },
    {
        name: 'drawEncounterChallengeForBucket returns reusable metadata for UI copy',
        run: () => {
            const challenge = (0, encounterService_1.drawEncounterChallengeForBucket)({ islandNumber: 7, tileIndex: 4, timeBucket: 200 });
            (0, testHarness_1.assert)(challenge.id.length > 0, 'Expected encounter challenges to expose stable ids');
            (0, testHarness_1.assert)(challenge.title.length > 0, 'Expected encounter challenges to expose titles');
            (0, testHarness_1.assert)(challenge.completionLabel.length > 0, 'Expected encounter challenges to expose completion labels');
        },
    },
    {
        name: 'rollEncounterReward scales richer rewards for higher islands and quiz type',
        run: () => {
            const values = [0.5, 0.01, 0.01, 0.01, 0.01];
            let index = 0;
            const reward = (0, encounterService_1.rollEncounterReward)({ islandNumber: 65, challengeType: 'quiz', random: () => values[index++] ?? 0.01 });
            (0, testHarness_1.assert)(reward.essence >= 14, 'Expected higher-tier encounter rewards to scale essence floor upward');
            (0, testHarness_1.assertEqual)(reward.dice > 0, true, 'Expected quiz rewards to be able to grant dice');
            (0, testHarness_1.assertEqual)(reward.spinTokens, 1, 'Expected deterministic random path to grant a spin token');
        },
    },
    {
        name: 'formatEncounterRewardSummary includes dice and spin rewards when present',
        run: () => {
            const summary = (0, encounterService_1.formatEncounterRewardSummary)({ essence: 18, walletShards: true, dice: 4, spinTokens: 1 });
            (0, testHarness_1.assert)(summary.includes('+4 dice'), 'Expected dice reward text in summary');
            (0, testHarness_1.assert)(summary.includes('+1 spin'), 'Expected spin reward text in summary');
            (0, testHarness_1.assert)(summary.includes('+18 essence'), 'Expected essence reward text in summary');
        },
    },
    {
        name: 'formatEncounterRewardSummary omits optional rewards when absent',
        run: () => {
            const summary = (0, encounterService_1.formatEncounterRewardSummary)({ essence: 9, walletShards: false, dice: 0, spinTokens: 0 });
            (0, testHarness_1.assertEqual)(summary, '+9 essence', 'Expected summary to stay compact when only essence is awarded');
        },
    },
];
