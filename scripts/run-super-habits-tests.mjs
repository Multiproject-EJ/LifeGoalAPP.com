import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-super-habits-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.super-habits-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllSuperHabitTests } = require(
    path.join(outDir, 'features/habits/__tests__/superHabits.test.js'),
  );
  runAllSuperHabitTests();
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
