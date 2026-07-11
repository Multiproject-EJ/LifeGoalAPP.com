import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-task-tower-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.task-tower-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllTaskTowerStateTests } = require(
    path.join(outDir, 'features/gamification/games/task-tower/__tests__/taskTowerState.test.js'),
  );
  runAllTaskTowerStateTests();
  console.log('task-tower-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
