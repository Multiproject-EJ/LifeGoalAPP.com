import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-quest-compass-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.quest-compass-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllQuestCompassViewModelTests } = require(
    path.join(outDir, 'features/quest-compass/__tests__/questCompassViewModel.test.js'),
  );
  runAllQuestCompassViewModelTests();
  console.log('quest-compass-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
