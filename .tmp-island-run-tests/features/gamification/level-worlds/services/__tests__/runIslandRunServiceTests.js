"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const creatureCatalog_test_1 = require("./creatureCatalog.test");
const creatureCollectionService_test_1 = require("./creatureCollectionService.test");
const creatureTreatInventoryService_test_1 = require("./creatureTreatInventoryService.test");
const creatureFitEngine_test_1 = require("./creatureFitEngine.test");
const encounterService_test_1 = require("./encounterService.test");
const islandBoardTopology_test_1 = require("./islandBoardTopology.test");
const islandRunFoundations_test_1 = require("./islandRunFoundations.test");
const islandRunContractV2Energy_test_1 = require("./islandRunContractV2Energy.test");
const islandRunContractV2Semantics_test_1 = require("./islandRunContractV2Semantics.test");
const islandRunContractV2StopResolver_test_1 = require("./islandRunContractV2StopResolver.test");
const islandRunContractV2EssenceBuild_test_1 = require("./islandRunContractV2EssenceBuild.test");
const islandRunContractV2RewardBar_test_1 = require("./islandRunContractV2RewardBar.test");
const islandRunProgression_test_1 = require("./islandRunProgression.test");
const islandRunRuntimeState_integration_test_1 = require("./islandRunRuntimeState.integration.test");
const islandRunTimerProgression_test_1 = require("./islandRunTimerProgression.test");
const islandRunStopCompletion_test_1 = require("./islandRunStopCompletion.test");
const islandRunDiceRegeneration_test_1 = require("./islandRunDiceRegeneration.test");
const islandRunStopTickets_test_1 = require("./islandRunStopTickets.test");
const islandRunShopAffordability_test_1 = require("./islandRunShopAffordability.test");
const islandRunBonusTile_test_1 = require("./islandRunBonusTile.test");
const islandRunRollAction_test_1 = require("./islandRunRollAction.test");
const islandRunTileRewardAction_test_1 = require("./islandRunTileRewardAction.test");
const islandRunProgressReset_test_1 = require("./islandRunProgressReset.test");
const islandRunStateStore_test_1 = require("./islandRunStateStore.test");
const islandRunStateActions_test_1 = require("./islandRunStateActions.test");
const minigameConsolidationPhase1_test_1 = require("./minigameConsolidationPhase1.test");
const minigameConsolidationPhase2_test_1 = require("./minigameConsolidationPhase2.test");
const minigameConsolidationPhase3_test_1 = require("./minigameConsolidationPhase3.test");
const suites = [
    { label: 'creatureCatalog', tests: creatureCatalog_test_1.creatureCatalogTests },
    { label: 'creatureCollectionService', tests: creatureCollectionService_test_1.creatureCollectionServiceTests },
    { label: 'creatureTreatInventoryService', tests: creatureTreatInventoryService_test_1.creatureTreatInventoryServiceTests },
    { label: 'creatureFitEngine', tests: creatureFitEngine_test_1.creatureFitEngineTests },
    { label: 'encounterService', tests: encounterService_test_1.encounterServiceTests },
    { label: 'islandBoardTopology', tests: islandBoardTopology_test_1.islandBoardTopologyTests },
    { label: 'islandRunFoundations', tests: islandRunFoundations_test_1.islandRunFoundationTests },
    { label: 'islandRunContractV2Energy', tests: islandRunContractV2Energy_test_1.islandRunContractV2EnergyTests },
    { label: 'islandRunContractV2Semantics', tests: islandRunContractV2Semantics_test_1.islandRunContractV2SemanticsTests },
    { label: 'islandRunContractV2StopResolver', tests: islandRunContractV2StopResolver_test_1.islandRunContractV2StopResolverTests },
    { label: 'islandRunContractV2EssenceBuild', tests: islandRunContractV2EssenceBuild_test_1.islandRunContractV2EssenceBuildTests },
    { label: 'islandRunContractV2RewardBar', tests: islandRunContractV2RewardBar_test_1.islandRunContractV2RewardBarTests },
    { label: 'islandRunProgression', tests: islandRunProgression_test_1.islandRunProgressionTests },
    { label: 'islandRunRuntimeStateIntegration', tests: islandRunRuntimeState_integration_test_1.islandRunRuntimeStateIntegrationTests },
    { label: 'islandRunTimerProgression', tests: islandRunTimerProgression_test_1.islandRunTimerProgressionTests },
    { label: 'islandRunStopCompletion', tests: islandRunStopCompletion_test_1.islandRunStopCompletionTests },
    { label: 'islandRunDiceRegeneration', tests: islandRunDiceRegeneration_test_1.islandRunDiceRegenerationTests },
    { label: 'islandRunStopTickets', tests: islandRunStopTickets_test_1.islandRunStopTicketsTests },
    { label: 'islandRunShopAffordability', tests: islandRunShopAffordability_test_1.islandRunShopAffordabilityTests },
    { label: 'islandRunBonusTile', tests: islandRunBonusTile_test_1.islandRunBonusTileTests },
    { label: 'islandRunRollAction', tests: islandRunRollAction_test_1.islandRunRollActionTests },
    { label: 'islandRunTileRewardAction', tests: islandRunTileRewardAction_test_1.islandRunTileRewardActionTests },
    { label: 'islandRunProgressReset', tests: islandRunProgressReset_test_1.islandRunProgressResetTests },
    { label: 'islandRunStateStore', tests: islandRunStateStore_test_1.islandRunStateStoreTests },
    { label: 'islandRunStateActions', tests: islandRunStateActions_test_1.islandRunStateActionsTests },
    { label: 'minigameConsolidationPhase1', tests: minigameConsolidationPhase1_test_1.minigameConsolidationPhase1Tests },
    { label: 'minigameConsolidationPhase2', tests: minigameConsolidationPhase2_test_1.minigameConsolidationPhase2Tests },
    { label: 'minigameConsolidationPhase3', tests: minigameConsolidationPhase3_test_1.minigameConsolidationPhase3Tests },
];
async function main() {
    let passed = 0;
    let failed = 0;
    for (const suite of suites) {
        for (const test of suite.tests) {
            try {
                await test.run();
                passed += 1;
                console.log(`PASS ${suite.label}: ${test.name}`);
            }
            catch (error) {
                failed += 1;
                const message = error instanceof Error ? error.message : String(error);
                console.error(`FAIL ${suite.label}: ${test.name}`);
                console.error(`  ${message}`);
            }
        }
    }
    console.log(`\nIsland Run tests complete: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        throw new Error(`Island Run tests failed: ${failed} case${failed === 1 ? '' : 's'} failing.`);
    }
}
void main();
