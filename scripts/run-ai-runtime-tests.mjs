import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-ai-runtime-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.ai-runtime-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAiRuntimeCoreTests } = require(
    path.join(outDir, 'services/ai/__tests__/aiRuntimeCore.test.js'),
  );
  await runAiRuntimeCoreTests();
  const { runAiPreferencesTests } = require(
    path.join(outDir, 'services/ai/__tests__/aiPreferences.test.js'),
  );
  runAiPreferencesTests();
  console.log('ai-runtime-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
