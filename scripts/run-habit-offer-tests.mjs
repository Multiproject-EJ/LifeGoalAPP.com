import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-habit-offer-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.habit-offer-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runAllTimeBoundOfferSortTests } = require(
    path.join(outDir, 'features/habits/__tests__/timeBoundOfferSort.test.js'),
  );
  const { runAllDailyOfferClaimTests } = require(
    path.join(outDir, 'features/habits/__tests__/dailyOfferClaim.test.js'),
  );
  const { runAllWisdomTreeGrowthTests } = require(
    path.join(outDir, 'features/zen-garden/__tests__/treeGrowth.test.js'),
  );
  const { runAllHabitCoachTests } = require(
    path.join(outDir, 'features/habits/__tests__/habitCoach.test.js'),
  );
  const { runAllHabitChainLogicTests } = require(
    path.join(outDir, 'features/habits/__tests__/habitChainLogic.test.js'),
  );
  const { runAllHabitRhythmTests } = require(
    path.join(outDir, 'features/habits/__tests__/habitRhythm.test.js'),
  );
  runAllTimeBoundOfferSortTests();
  await runAllDailyOfferClaimTests();
  runAllWisdomTreeGrowthTests();
  runAllHabitCoachTests();
  runAllHabitChainLogicTests();
  runAllHabitRhythmTests();
  console.log('habit-offer-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
