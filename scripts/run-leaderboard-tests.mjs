import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-leaderboard-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.leaderboard-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllLeaderboardTests } = require(
    path.join(outDir, 'services/__tests__/leaderboardScore.test.js'),
  );
  const { runAllPublicIdentityTests } = require(
    path.join(outDir, 'services/__tests__/publicIdentity.test.js'),
  );
  runAllLeaderboardTests();
  runAllPublicIdentityTests();
  console.log('leaderboard-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
