import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
// Use Vite's existing dependency (also works with pnpm's strict layout).
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const result = await build({
  stdin: {
    contents: `
      import { runJourneyProgressionTests } from './src/features/gamification/level-worlds/services/__tests__/journeyProgression.test';
      import { combinedJourneyRewardClaimActionTests } from './src/features/gamification/level-worlds/services/__tests__/combinedJourneyRewardClaimAction.test';
      import { islandRunCompletionTests } from './src/features/gamification/level-worlds/services/__tests__/islandRunCompletion.test';
      (async () => {
        await runJourneyProgressionTests();
        for (const test of [...combinedJourneyRewardClaimActionTests, ...islandRunCompletionTests]) await test.run();
        console.log('journey canonical integration: ' + (combinedJourneyRewardClaimActionTests.length + islandRunCompletionTests.length) + ' completion/travel/claim tests passed (mocked grants only)');
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  define: { 'import.meta.env': '{}' },
});
const run = spawnSync(process.execPath, ['--input-type=commonjs'], {
  input: result.outputFiles[0].text, encoding: 'utf8',
});
process.stdout.write(run.stdout ?? '');
process.stderr.write(run.stderr ?? '');
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
