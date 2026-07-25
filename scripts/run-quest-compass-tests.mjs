import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-quest-compass-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.quest-compass-tests.json');
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
