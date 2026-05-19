import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-energy-feature-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.energy-feature-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllEnergyFeatureAccessTests } = require(
    path.join(outDir, 'features/meditation/__tests__/energyFeatureAccess.test.js'),
  );
  runAllEnergyFeatureAccessTests();
  console.log('energy-feature-gating-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
