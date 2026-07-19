import {
  getTodayStarUpgradeQueue,
  getTodayWinsStarCount,
  getTodayWinsTier,
} from '../todayStarCelebrationModel';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runTodayStarCelebrationModelTests(): void {
  assertEqual(getTodayWinsTier(0), 'zero_star', 'Zero score has no star');
  assertEqual(getTodayWinsTier(1), 'one_star', 'First positive score earns one star');
  assertEqual(getTodayWinsTier(40), 'two_star', 'Forty points earns two stars');
  assertEqual(getTodayWinsTier(75), 'three_star', 'Seventy-five points earns three stars');
  assertEqual(getTodayWinsStarCount(74), 2, 'Score-to-count conversion follows tier thresholds');
  assertEqual(getTodayStarUpgradeQueue(0, 1).join(','), '1', 'First upgrade queues one celebration');
  assertEqual(getTodayStarUpgradeQueue(1, 3).join(','), '2,3', 'Skipped thresholds celebrate in order');
  assertEqual(getTodayStarUpgradeQueue(3, 2).length, 0, 'Score reductions never create celebrations');
  assertEqual(getTodayStarUpgradeQueue(2, 2).length, 0, 'The same tier never replays');
}
