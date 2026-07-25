import {
  COMEBACK_MAX_DICE,
  COMEBACK_MAX_GAME_TOKENS,
  computeComebackReward,
  daysBetweenDateKeys,
  findEggsHatchedDuringAbsence,
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

function atLocalTime(dateKey: string, hour = 12): number {
  return new Date(`${dateKey}T${String(hour).padStart(2, '0')}:00:00`).getTime();
}

function testHatchedEggDetection(): void {
  const lastVisit = '2026-07-20';
  const now = atLocalTime('2026-07-25');

  const ledger = {
    '1': { tier: 'common', hatchAtMs: atLocalTime('2026-07-22'), status: 'ready' },
    '2': { tier: 'mythic', hatchAtMs: atLocalTime('2026-07-21'), status: 'incubating' },
    // Hatched before the absence began — not news on return.
    '3': { tier: 'rare', hatchAtMs: atLocalTime('2026-07-02'), status: 'ready' },
    // Already resolved in the hatchery — gone, not waiting.
    '4': { tier: 'rare', hatchAtMs: atLocalTime('2026-07-23'), status: 'collected' },
    '5': { tier: 'common', hatchAtMs: atLocalTime('2026-07-23'), status: 'sold' },
    // Still incubating — hatches after the return.
    '6': { tier: 'rare', hatchAtMs: atLocalTime('2026-07-28'), status: 'incubating' },
  };

  const hatched = findEggsHatchedDuringAbsence(ledger, lastVisit, now);
  assertEqual(hatched.length, 2, 'only unopened eggs that hatched inside the absence window count');
  assertEqual(hatched[0].ledgerKey, '2', 'results are ordered by hatch time, earliest first');
  assertEqual(hatched[0].tier, 'mythic', 'carries the egg tier through for display');
  assertEqual(hatched[1].ledgerKey, '1', 'the later hatch comes second');

  assertEqual(findEggsHatchedDuringAbsence(null, lastVisit, now).length, 0, 'a missing ledger yields nothing');
  assertEqual(findEggsHatchedDuringAbsence({}, lastVisit, now).length, 0, 'an empty ledger yields nothing');

  const malformed = {
    '1': undefined,
    '2': { tier: 'legendary', hatchAtMs: atLocalTime('2026-07-22'), status: 'ready' },
    '3': { tier: 'common', hatchAtMs: Number.NaN, status: 'ready' },
  };
  assertEqual(
    findEggsHatchedDuringAbsence(malformed, lastVisit, now).length,
    0,
    'unknown tiers and unusable timestamps are skipped rather than rendered',
  );
}

function testCelebrationCarriesHatchedEggs(): void {
  resetComebackVisits(USER);
  markComebackVisit(USER, '2026-07-20');

  const ledger = {
    '1': { tier: 'rare' as const, hatchAtMs: atLocalTime('2026-07-22'), status: 'ready' },
  };
  const celebration = startComebackCelebration(USER, '2026-07-25', ledger);
  assert(celebration !== null, 'a five-day absence celebrates');
  assertEqual(celebration.hatchedEggs.length, 1, 'the celebration reports the egg that hatched while away');
  assertEqual(celebration.hatchedEggs[0].tier, 'rare', 'the egg tier survives onto the celebration');

  resetComebackVisits(USER);
  markComebackVisit(USER, '2026-07-20');
  const withoutEggs = startComebackCelebration(USER, '2026-07-25');
  assert(withoutEggs !== null, 'the celebration still fires with no egg ledger available');
  assertEqual(withoutEggs.hatchedEggs.length, 0, 'no ledger means no egg announcement');
}

export function runAllComebackCelebrationTests(): void {
  testRewardCurve();
  testDayCounting();
  testFirstRunDoesNotCelebrate();
  testShortAbsencesAreOrdinary();
  testGrantIsAppliedOnceAndCredited();
  testDateKeyFormat();
  testHatchedEggDetection();
  testCelebrationCarriesHatchedEggs();
}
