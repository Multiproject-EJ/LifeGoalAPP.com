import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const output = path.resolve(`.tmp-island-completion-${process.pid}.mjs`);
const suites = ['islandRunCompletion', 'islandRunMissionTracker', 'islandRunBestNextActionAdvisor',
  'islandRunContractV2EssenceBuild', 'islandRunContractV2StopResolver', 'islandRunStateActions',
  'islandRunPostRareTreasurePathAction'];
try {
  await build({ stdin: { contents: suites.map((name, i) => `import { ${name}Tests as suite${i} } from './src/features/gamification/level-worlds/services/__tests__/${name}.test.ts';`).join('\n') + `
    let passed=0, failed=0;
    for (const test of [${suites.map((_, i) => `...suite${i}`).join(',')}]) {
      if (!test.name.includes(${JSON.stringify(process.argv[2] ?? '')})) continue;
      try { await test.run(); passed++; console.log('PASS', test.name); }
      catch (error) { failed++; console.error('FAIL', test.name, error.stack); }
    }
    console.log({passed,failed}); if(failed) process.exitCode=1;
  `, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: output });
  await import(pathToFileURL(output).href);
} finally { rmSync(output, { force: true }); }
