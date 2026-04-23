import { creatureCatalogTests } from './creatureCatalog.test';
import { creatureCollectionServiceTests } from './creatureCollectionService.test';
import { creatureTreatInventoryServiceTests } from './creatureTreatInventoryService.test';
import { creatureFitEngineTests } from './creatureFitEngine.test';
import { encounterServiceTests } from './encounterService.test';
import { islandBoardTopologyTests } from './islandBoardTopology.test';
import { islandRunFoundationTests } from './islandRunFoundations.test';
import { islandRunContractV2EnergyTests } from './islandRunContractV2Energy.test';
import { islandRunContractV2SemanticsTests } from './islandRunContractV2Semantics.test';
import { islandRunContractV2StopResolverTests } from './islandRunContractV2StopResolver.test';
import { islandRunContractV2EssenceBuildTests } from './islandRunContractV2EssenceBuild.test';
import { islandRunContractV2RewardBarTests } from './islandRunContractV2RewardBar.test';
import { islandRunProgressionTests } from './islandRunProgression.test';
import { islandRunRuntimeStateIntegrationTests } from './islandRunRuntimeState.integration.test';
import { islandRunTimerProgressionTests } from './islandRunTimerProgression.test';
import { islandRunStopCompletionTests } from './islandRunStopCompletion.test';
import { islandRunStopStreakTests } from './islandRunStopStreak.test';
import { islandRunDiceRegenerationTests } from './islandRunDiceRegeneration.test';
import { islandRunStopTicketsTests } from './islandRunStopTickets.test';
import { islandRunStopTapRoutingTests } from './islandRunStopTapRouting.test';
import { islandRunShopAffordabilityTests } from './islandRunShopAffordability.test';
import { islandRunEggSellAdvisorTests } from './islandRunEggSellAdvisor.test';
import { islandRunBonusTileTests } from './islandRunBonusTile.test';
import { islandRunActionMutexTests } from './islandRunActionMutex.test';
import { islandRunRollActionTests } from './islandRunRollAction.test';
import { islandRunTileRewardActionTests } from './islandRunTileRewardAction.test';
import { islandRunProgressResetTests } from './islandRunProgressReset.test';
import { islandRunStateStoreTests } from './islandRunStateStore.test';
import { islandRunStateActionsTests } from './islandRunStateActions.test';
import { minigameConsolidationPhase1Tests } from './minigameConsolidationPhase1.test';
import { minigameConsolidationPhase2Tests } from './minigameConsolidationPhase2.test';
import { minigameConsolidationPhase3Tests } from './minigameConsolidationPhase3.test';
import { minigameConsolidationPhase4Tests } from './minigameConsolidationPhase4.test';
import { minigameConsolidationPhase5Tests } from './minigameConsolidationPhase5.test';
import { minigameConsolidationPhase6Tests } from './minigameConsolidationPhase6.test';
import { islandRunShooterControllerBridgeTests } from './islandRunShooterControllerBridge.test';
import { islandRunShooterControllerTelemetryTests } from './islandRunShooterControllerTelemetry.test';
import { shooterBlitzLaneLogicTests } from './shooterBlitzLaneLogic.test';
import { islandRunShooterControllerQaMatrixTests } from './islandRunShooterControllerQaMatrix.test';
import type { TestCase } from './testHarness';

const suites: Array<{ label: string; tests: TestCase[] }> = [
  { label: 'creatureCatalog', tests: creatureCatalogTests },
  { label: 'creatureCollectionService', tests: creatureCollectionServiceTests },
  { label: 'creatureTreatInventoryService', tests: creatureTreatInventoryServiceTests },
  { label: 'creatureFitEngine', tests: creatureFitEngineTests },
  { label: 'encounterService', tests: encounterServiceTests },
  { label: 'islandBoardTopology', tests: islandBoardTopologyTests },
  { label: 'islandRunFoundations', tests: islandRunFoundationTests },
  { label: 'islandRunContractV2Energy', tests: islandRunContractV2EnergyTests },
  { label: 'islandRunContractV2Semantics', tests: islandRunContractV2SemanticsTests },
  { label: 'islandRunContractV2StopResolver', tests: islandRunContractV2StopResolverTests },
  { label: 'islandRunContractV2EssenceBuild', tests: islandRunContractV2EssenceBuildTests },
  { label: 'islandRunContractV2RewardBar', tests: islandRunContractV2RewardBarTests },
  { label: 'islandRunProgression', tests: islandRunProgressionTests },
  { label: 'islandRunRuntimeStateIntegration', tests: islandRunRuntimeStateIntegrationTests },
  { label: 'islandRunTimerProgression', tests: islandRunTimerProgressionTests },
  { label: 'islandRunStopCompletion', tests: islandRunStopCompletionTests },
  { label: 'islandRunStopStreak', tests: islandRunStopStreakTests },
  { label: 'islandRunDiceRegeneration', tests: islandRunDiceRegenerationTests },
  { label: 'islandRunStopTickets', tests: islandRunStopTicketsTests },
  { label: 'islandRunStopTapRouting', tests: islandRunStopTapRoutingTests },
  { label: 'islandRunShopAffordability', tests: islandRunShopAffordabilityTests },
  { label: 'islandRunEggSellAdvisor', tests: islandRunEggSellAdvisorTests },
  { label: 'islandRunBonusTile', tests: islandRunBonusTileTests },
  { label: 'islandRunActionMutex', tests: islandRunActionMutexTests },
  { label: 'islandRunRollAction', tests: islandRunRollActionTests },
  { label: 'islandRunTileRewardAction', tests: islandRunTileRewardActionTests },
  { label: 'islandRunProgressReset', tests: islandRunProgressResetTests },
  { label: 'islandRunStateStore', tests: islandRunStateStoreTests },
  { label: 'islandRunStateActions', tests: islandRunStateActionsTests },
  { label: 'minigameConsolidationPhase1', tests: minigameConsolidationPhase1Tests },
  { label: 'minigameConsolidationPhase2', tests: minigameConsolidationPhase2Tests },
  { label: 'minigameConsolidationPhase3', tests: minigameConsolidationPhase3Tests },
  { label: 'minigameConsolidationPhase4', tests: minigameConsolidationPhase4Tests },
  { label: 'minigameConsolidationPhase5', tests: minigameConsolidationPhase5Tests },
  { label: 'minigameConsolidationPhase6', tests: minigameConsolidationPhase6Tests },
  { label: 'islandRunShooterControllerBridge', tests: islandRunShooterControllerBridgeTests },
  { label: 'islandRunShooterControllerTelemetry', tests: islandRunShooterControllerTelemetryTests },
  { label: 'shooterBlitzLaneLogic', tests: shooterBlitzLaneLogicTests },
  { label: 'islandRunShooterControllerQaMatrix', tests: islandRunShooterControllerQaMatrixTests },
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
      } catch (error) {
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
