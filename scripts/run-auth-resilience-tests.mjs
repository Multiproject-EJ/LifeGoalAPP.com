import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-auth-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.auth-tests.json'], {
    stdio: 'inherit',
  });
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

