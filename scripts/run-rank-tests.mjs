import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-rank-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.rank-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllRankTests } = require(
    path.join(outDir, 'features/rank/__tests__/rankModel.test.js'),
  );
  runAllRankTests();
  console.log('rank-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
