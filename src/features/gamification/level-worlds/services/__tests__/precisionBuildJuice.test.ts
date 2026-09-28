import {
  appendPrecisionRow,
  PRECISION_SUCCESS_ROW_MAX,
  precisionComboTier,
  precisionMilestoneBanner,
} from '../precisionBuild';
import { assert, assertEqual, type TestCase } from './testHarness';

export const precisionBuildJuiceTests: TestCase[] = [
  {
    name: 'skill build success row keeps every recent hit as a gem, newest last, capped',
    run: async () => {
      let row = appendPrecisionRow([], 'perfect', 1);
      row = appendPrecisionRow(row, 'good', 2);
      assertEqual(row.map((entry) => entry.judgement).join(','), 'perfect,good', 'hits placed in order');
      for (let i = 0; i < 20; i += 1) row = appendPrecisionRow(row, 'good', 10 + i);
      assertEqual(row.length, PRECISION_SUCCESS_ROW_MAX, 'the row stays tidy');
      assertEqual(row[row.length - 1]?.id, 29, 'newest hit is last');
      // @ts-ignore Node-only source contract check.
      const fs = await import('fs');
      const ring = fs.readFileSync('src/features/gamification/level-worlds/components/PrecisionBuildRing.tsx', 'utf8');
      assert(!ring.includes("appendPrecisionRow(current, 'miss'"), 'only successes are placed in the row');
    },
  },
  {
    name: 'skill build heats up with the streak and celebrates milestones',
    run: () => {
      assertEqual(precisionComboTier(0), 'cool', 'start cool');
      assertEqual(precisionComboTier(3), 'warm', 'warm at 3');
      assertEqual(precisionComboTier(5), 'hot', 'hot at 5');
      assertEqual(precisionComboTier(12), 'blazing', 'blazing from 10');
      assertEqual(precisionMilestoneBanner(5), 'ON FIRE! ×5', 'banner at 5');
      assertEqual(precisionMilestoneBanner(10), 'UNSTOPPABLE! ×10', 'banner at 10');
      assertEqual(precisionMilestoneBanner(15), 'LEGENDARY ×15', 'every 5 after');
      assertEqual(precisionMilestoneBanner(7), null, 'quiet otherwise');
    },
  },
];
