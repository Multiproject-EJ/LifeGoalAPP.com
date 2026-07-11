import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-service-resilience-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.service-resilience-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllServiceResilienceTests } = require(
    path.join(outDir, 'services/service-health/__tests__/serviceResilience.test.js'),
  );
  await runAllServiceResilienceTests();
  console.log('service-resilience-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
