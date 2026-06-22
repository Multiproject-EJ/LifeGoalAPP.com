import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-leaderboard-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.leaderboard-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllLeaderboardTests } = require(
    path.join(outDir, 'services/__tests__/leaderboardScore.test.js'),
  );
  runAllLeaderboardTests();
  console.log('leaderboard-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
