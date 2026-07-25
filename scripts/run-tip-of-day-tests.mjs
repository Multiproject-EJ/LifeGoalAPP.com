import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-tip-of-day-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.tip-of-day-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runTipOfDayContentTests } = require(
    path.join(outDir, 'features/tip-of-day/__tests__/tipOfDayContent.test.js'),
  );
  const { runHabitInsightModelTests } = require(
    path.join(outDir, 'features/habits/__tests__/habitInsightModel.test.js'),
  );
  runTipOfDayContentTests();
  runHabitInsightModelTests();
  console.log('tip-of-day-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
