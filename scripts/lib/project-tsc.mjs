import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Compiles a test tsconfig with the TypeScript this project depends on.
 *
 * Calling a bare `tsc` resolves against PATH, so a globally installed compiler
 * silently wins over the pinned one — and a global on a different major rejects
 * the `ignoreDeprecations` value the pinned compiler requires, failing the suite
 * for reasons that have nothing to do with the code under test. Resolving
 * typescript's own bin keeps every machine on the version in package.json.
 */
export function compileWithProjectTsc(tsconfigPath, options = {}) {
  const tscBin = require.resolve('typescript/bin/tsc');
  execFileSync(process.execPath, [tscBin, '-p', tsconfigPath], {
    stdio: 'inherit',
    ...options,
  });
}
