import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-tip-of-day-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.tip-of-day-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runTipOfDayContentTests } = require(
    path.join(outDir, 'features/tip-of-day/__tests__/tipOfDayContent.test.js'),
  );
  runTipOfDayContentTests();
  console.log('tip-of-day-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
