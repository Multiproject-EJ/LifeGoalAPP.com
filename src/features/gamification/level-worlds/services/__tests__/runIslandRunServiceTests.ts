import { creatureCatalogTests } from './creatureCatalog.test';
import { creatureCollectionServiceTests } from './creatureCollectionService.test';
import { creatureTreatInventoryServiceTests } from './creatureTreatInventoryService.test';
import { islandRunFoundationTests } from './islandRunFoundations.test';
import type { TestCase } from './testHarness';

const suites: Array<{ label: string; tests: TestCase[] }> = [
  { label: 'creatureCatalog', tests: creatureCatalogTests },
  { label: 'creatureCollectionService', tests: creatureCollectionServiceTests },
  { label: 'creatureTreatInventoryService', tests: creatureTreatInventoryServiceTests },
  { label: 'islandRunFoundations', tests: islandRunFoundationTests },
];

let passed = 0;
let failed = 0;

for (const suite of suites) {
  for (const test of suite.tests) {
    try {
      test.run();
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
