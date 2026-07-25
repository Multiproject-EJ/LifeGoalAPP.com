import { compileWithProjectTsc } from './lib/project-tsc.mjs';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-theme-access-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  compileWithProjectTsc('tsconfig.theme-access-tests.json');
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  require(path.join(outDir, 'contexts/__tests__/themeAccessCore.test.js'));
  console.log('theme-access-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
