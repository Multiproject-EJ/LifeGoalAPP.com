import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-quest-model-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.quest-model-tests.json'], { stdio: 'inherit' });
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
