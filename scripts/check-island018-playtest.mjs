import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const output = path.resolve(`.tmp-island018-playtest-${process.pid}.mjs`);
const suites = [
  ['islandRunCompassBookReceipt.test', 'islandRunCompassBookReceiptTests'],
  ['islandRunSignatureMissions.test', 'islandRunSignatureMissionTests'],
  ['islandRun3DWorldRouting.test', 'islandRun3DWorldRoutingTests'],
  ['island18JungleExpeditionThreeWorldContract.test', 'island18JungleExpeditionThreeWorldContractTests'],
];
const imports = suites.map(([file, name], index) => (
  `import { ${name} as suite${index} } from './src/features/gamification/level-worlds/services/__tests__/${file}.ts';`
)).join('\n');

try {
  await build({
    stdin: {
      contents: `${imports}
        let passed = 0, failed = 0;
        for (const test of [${suites.map((_, index) => `...suite${index}`).join(', ')}]) {
          if (!test.name.includes(${JSON.stringify(process.argv[2] ?? '')})) continue;
          try { await test.run(); passed++; console.log('PASS', test.name); }
          catch (error) { failed++; console.error('FAIL', test.name, error.message); }
        }
        console.log({ passed, failed });
        if (failed) process.exitCode = 1;
      `,
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: output,
  });
  await import(pathToFileURL(output).href);
} finally {
  rmSync(output, { force: true });
}
