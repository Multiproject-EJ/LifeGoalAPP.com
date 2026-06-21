import {
  BALANCE_SYNERGY_MAX,
  HABIT_CONSISTENCY_CAP,
  computeBalanceMultiplier,
  cumulativeXpForLevel,
  deriveCombinedJourneyLevel,
  levelForXp,
} from '../combinedJourneyLevel';
import { assert, assertEqual, type TestCase } from './testHarness';

export const combinedJourneyLevelTests: TestCase[] = [
  {
    name: 'empty input yields a safe level 1 baseline',
    run: () => {
      const summary = deriveCombinedJourneyLevel();
      assertEqual(summary.level, 1, 'Expected baseline level 1 with no milestones');
      assertEqual(summary.xp, 0, 'Expected zero xp with no milestones');
      assertEqual(summary.balanceMultiplier, 1, 'Expected no synergy with empty sides');
      assertEqual(summary.nextThresholdLevel, 2, 'Expected next chest at level 2');
      assert(
        summary.progressPercentToNextLevel >= 0 && summary.progressPercentToNextLevel <= 100,
        'Expected progress percent within bounds',
      );
    },
  },
  {
    name: 'level curve is monotonic and cumulative starts at zero',
    run: () => {
      assertEqual(cumulativeXpForLevel(1), 0, 'Expected level 1 to require 0 xp');
      let previous = -1;
      for (let level = 1; level <= 12; level += 1) {
        const xp = cumulativeXpForLevel(level);
        assert(xp > previous, `Expected cumulative xp to increase at level ${level}`);
        assertEqual(levelForXp(xp), level, `Expected xp floor to map back to level ${level}`);
      }
    },
  },
  {
    name: 'balance multiplier only rewards advancing both sides',
    run: () => {
      assertEqual(computeBalanceMultiplier(500, 0), 1, 'Expected no synergy when life side is empty');
      assertEqual(computeBalanceMultiplier(0, 500), 1, 'Expected no synergy when game side is empty');
      assertEqual(
        computeBalanceMultiplier(400, 400),
        1 + BALANCE_SYNERGY_MAX,
        'Expected max synergy when both sides contribute equally',
      );
      const lopsided = computeBalanceMultiplier(1000, 100);
      assert(lopsided > 1 && lopsided < 1 + BALANCE_SYNERGY_MAX, 'Expected partial synergy when sides are uneven');
    },
  },
  {
    name: 'level is monotonic in milestones (adding progress never lowers level)',
    run: () => {
      const base = deriveCombinedJourneyLevel({ islandsCompleted: 3, completedGoals: 2 });
      const more = deriveCombinedJourneyLevel({ islandsCompleted: 4, completedGoals: 2 });
      assert(more.level >= base.level, 'Expected adding an island to not lower the level');
      assert(more.xp >= base.xp, 'Expected adding an island to not lower xp');
    },
  },
  {
    name: 'habit consistency is capped so habit count cannot dominate',
    run: () => {
      const capped = deriveCombinedJourneyLevel({ habitConsistencyScore: HABIT_CONSISTENCY_CAP });
      const overCapped = deriveCombinedJourneyLevel({ habitConsistencyScore: HABIT_CONSISTENCY_CAP + 50 });
      assertEqual(overCapped.lifeXp, capped.lifeXp, 'Expected habit contribution to be capped');
    },
  },
  {
    name: 'sanitizes negative and non-finite inputs',
    run: () => {
      const summary = deriveCombinedJourneyLevel({
        islandsCompleted: -5,
        currentIslandProgressPercent: 999,
        completedGoals: Number.NaN,
        habitConsistencyScore: -3,
      });
      assert(summary.xp >= 0, 'Expected non-negative xp from sanitized inputs');
      assertEqual(summary.level, levelForXp(summary.xp), 'Expected level to match its xp');
    },
  },
];
