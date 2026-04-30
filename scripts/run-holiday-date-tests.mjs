import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-holiday-date-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('./node_modules/.bin/tsc', ['-p', 'tsconfig.holiday-date-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runHolidayDateRulesTests } = require(path.join(outDir, '__tests__/holidayDateRules.test.js'));
  runHolidayDateRulesTests();
  console.log('holiday-date-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
