import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-compass-book-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.compass-book-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllCompassBookTests } = require(
    path.join(outDir, 'features/compass-book/__tests__/compassBook.test.js'),
  );
  runAllCompassBookTests();
  console.log('compass-book-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
