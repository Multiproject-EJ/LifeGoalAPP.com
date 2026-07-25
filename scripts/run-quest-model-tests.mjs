import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-quest-model-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.quest-model-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllQuestModelTests } = require(
    path.join(outDir, 'features/quests/__tests__/questModel.test.js'),
  );
  runAllQuestModelTests();
  console.log('quest-model-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
