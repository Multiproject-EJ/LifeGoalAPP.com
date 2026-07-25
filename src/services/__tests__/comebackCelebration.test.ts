import {
  COMEBACK_MAX_DICE,
  COMEBACK_MAX_GAME_TOKENS,
  computeComebackReward,
  daysBetweenDateKeys,
  markComebackVisit,
  peekComebackCelebration,
  resetComebackVisits,
  startComebackCelebration,
  toComebackDateKey,
} from '../comebackCelebration';
import { loadCurrencyBalance } from '../gameRewards';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

// The browser stubs this suite runs against are installed by
// scripts/run-comeback-celebration-tests.mjs before this module is loaded:
// gameRewards resolves its localStorage handle at import time, so a stub
// installed from inside a test would arrive too late to be seen.

const USER = 'user-comeback-test';

function testRewardCurve(): void {
  assertEqual(computeComebackReward(2).dice, 150, 'two days away pays the base dice');
  assertEqual(computeComebackReward(2).gameTokens, 5, 'two days away pays the base tokens');
  assertEqual(computeComebackReward(5).dice, 270, 'five days away scales dice by three extra days');
  assertEqual(computeComebackReward(5).gameTokens, 8, 'five days away scales tokens by three extra days');

  assertEqual(computeComebackReward(14).dice, COMEBACK_MAX_DICE, 'two weeks away hits the dice ceiling');
  assertEqual(computeComebackReward(365).dice, COMEBACK_MAX_DICE, 'a year away cannot exceed the dice ceiling');
  assertEqual(
    computeComebackReward(365).gameTokens,
    COMEBACK_MAX_GAME_TOKENS,
    'a year away cannot exceed the token ceiling',
  );
}

function testDayCounting(): void {
  assertEqual(daysBetweenDateKeys('2026-07-20', '2026-07-22'), 2, 'counts whole days between keys');
  assertEqual(daysBetweenDateKeys('2026-07-22', '2026-07-22'), 0, 'same day is zero days apart');
  // Spans a month boundary and a DST-shifting window in most locales.
  assertEqual(daysBetweenDateKeys('2026-02-26', '2026-03-04'), 6, 'counts across a month boundary');
}

function testFirstRunDoesNotCelebrate(): void {
  resetComebackVisits(USER);
  const celebration = startComebackCelebration(USER, '2026-07-25');
  assertEqual(celebration, null, 'a device with no visit history never opens with a welcome back');
  const laterReturn = peekComebackCelebration(USER, '2026-07-27');
  assert(laterReturn !== null, 'the first run still stamps the visit so a later return is measurable');
  assertEqual(laterReturn.daysAway, 2, 'the stamped first-run visit anchors the absence count');
}

function testShortAbsencesAreOrdinary(): void {
  resetComebackVisits(USER);
  markComebackVisit(USER, '2026-07-25');
  assertEqual(startComebackCelebration(USER, '2026-07-25'), null, 'a same-day return does not celebrate');
  assertEqual(startComebackCelebration(USER, '2026-07-26'), null, 'a next-day return does not celebrate');
}

function testGrantIsAppliedOnceAndCredited(): void {
  resetComebackVisits(USER);
  markComebackVisit(USER, '2026-07-20');

  const before = loadCurrencyBalance(USER);
  const celebration = startComebackCelebration(USER, '2026-07-25');
  assert(celebration !== null, 'a five-day absence celebrates');
  assertEqual(celebration.daysAway, 5, 'reports the true absence length');

  const after = loadCurrencyBalance(USER);
  assertEqual(after.dice - before.dice, 270, 'the dice reward reaches the balance');
  assertEqual(after.gameTokens - before.gameTokens, 8, 'the token reward reaches the balance');

  // A reload on the same day must not pay twice.
  assertEqual(startComebackCelebration(USER, '2026-07-25'), null, 'a reload does not re-grant');
  const afterReload = loadCurrencyBalance(USER);
  assertEqual(afterReload.dice, after.dice, 'a reload leaves the dice balance untouched');
  assertEqual(afterReload.gameTokens, after.gameTokens, 'a reload leaves the token balance untouched');
}

function testDateKeyFormat(): void {
  assertEqual(toComebackDateKey(new Date(2026, 0, 5)), '2026-01-05', 'pads month and day');
}

export function runAllComebackCelebrationTests(): void {
  testRewardCurve();
  testDayCounting();
  testFirstRunDoesNotCelebrate();
  testShortAbsencesAreOrdinary();
  testGrantIsAppliedOnceAndCredited();
  testDateKeyFormat();
}
