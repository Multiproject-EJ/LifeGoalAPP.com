import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-goal-pillar-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.goal-pillar-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllGoalPillarTests } = require(
    path.join(outDir, 'features/goals/__tests__/goalPillars.test.js'),
  );
  runAllGoalPillarTests();
  console.log('goal-pillar-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
