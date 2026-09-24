import { island17TitansRestThreeWorldContractTests } from './island17TitansRestThreeWorldContract.test';
import { islandRun3DWorldRoutingTests } from './islandRun3DWorldRouting.test';
import type { TestCase } from './testHarness';

const suites: Array<{ label: string; tests: TestCase[] }> = [
  { label: 'islandRun3DWorldRouting', tests: islandRun3DWorldRoutingTests },
  { label: 'island17TitansRestThreeWorldContract', tests: island17TitansRestThreeWorldContractTests },
];

async function main(): Promise<void> {
  let passed = 0;

  for (const suite of suites) {
    for (const test of suite.tests) {
      await test.run();
      passed += 1;
      console.log(`PASS ${suite.label}: ${test.name}`);
    }
  }

  console.log(`Island 017 focused tests complete: ${passed} passed.`);
}

void main();
