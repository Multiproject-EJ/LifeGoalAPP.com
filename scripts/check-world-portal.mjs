import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const built = await build({ stdin: { resolveDir: process.cwd(), contents: `
import {worldPortalTests} from './src/features/gamification/level-worlds/services/__tests__/worldPortal.test';
(async()=>{for(const test of worldPortalTests){await test.run();console.log('PASS',test.name)}console.log(worldPortalTests.length+' portal suites passed (local fixtures, no remote client)')})().catch(error=>{console.error(error);process.exitCode=1});
` }, bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
const run = spawnSync(process.execPath, ['--input-type=commonjs'], { input: built.outputFiles[0].text, encoding: 'utf8' });
process.stdout.write(run.stdout ?? ''); process.stderr.write(run.stderr ?? '');
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
