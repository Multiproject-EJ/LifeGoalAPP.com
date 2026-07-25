import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-auth-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.auth-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllAuthInitializationTests } = require(
    path.join(outDir, 'features/auth/__tests__/authInitialization.test.js'),
  );
  runAllAuthInitializationTests();
  console.log('auth-resilience-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
