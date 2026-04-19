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
import { islandRunDiceRegenerationTests } from './islandRunDiceRegeneration.test';
import { islandRunStopTicketsTests } from './islandRunStopTickets.test';
import { islandRunShopAffordabilityTests } from './islandRunShopAffordability.test';
import { islandRunBonusTileTests } from './islandRunBonusTile.test';
import { islandRunRollActionTests } from './islandRunRollAction.test';
import { islandRunProgressResetTests } from './islandRunProgressReset.test';
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
  { label: 'islandRunDiceRegeneration', tests: islandRunDiceRegenerationTests },
  { label: 'islandRunStopTickets', tests: islandRunStopTicketsTests },
  { label: 'islandRunShopAffordability', tests: islandRunShopAffordabilityTests },
  { label: 'islandRunBonusTile', tests: islandRunBonusTileTests },
  { label: 'islandRunRollAction', tests: islandRunRollActionTests },
  { label: 'islandRunProgressReset', tests: islandRunProgressResetTests },
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
