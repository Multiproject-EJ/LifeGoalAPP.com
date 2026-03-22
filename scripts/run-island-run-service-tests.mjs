import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const outDir = path.resolve('.tmp-island-run-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('./node_modules/.bin/tsc', ['-p', 'tsconfig.island-run-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));

  const runnerPath = path.join(outDir, 'features/gamification/level-worlds/services/__tests__/runIslandRunServiceTests.js');
  await import(pathToFileURL(runnerPath).href);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
