import {
  addDays,
  formatISODate,
  getDayStartMs,
  getNextDayBoundaryMs,
  getTodayKey,
  parseISODate,
} from '../appDay';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runAllAppDayTests(): void {
  // formatISODate uses LOCAL components (not UTC), so a locally-constructed date
  // formats to its own civil date regardless of timezone.
  assertEqual(formatISODate(new Date(2026, 5, 27)), '2026-06-27', 'formats a local date');
  assertEqual(formatISODate(new Date(2026, 0, 5)), '2026-01-05', 'zero-pads month and day');

  // parseISODate builds a LOCAL-midnight date.
  const parsed = parseISODate('2026-06-27');
  assertEqual(parsed.getFullYear(), 2026, 'parses year');
  assertEqual(parsed.getMonth(), 5, 'parses month (0-indexed)');
  assertEqual(parsed.getDate(), 27, 'parses day');
  assertEqual(parsed.getHours(), 0, 'parsed date is at local midnight');

  // Round-trips losslessly.
  assertEqual(formatISODate(parseISODate('2026-12-31')), '2026-12-31', 'round-trips a key');

  // addDays crosses month/year boundaries.
  assertEqual(formatISODate(addDays(parseISODate('2026-06-27'), 1)), '2026-06-28', 'adds a day');
  assertEqual(formatISODate(addDays(parseISODate('2026-12-31'), 1)), '2027-01-01', 'adds across year boundary');
  assertEqual(formatISODate(addDays(parseISODate('2026-03-01'), -1)), '2026-02-28', 'subtracts a day');

  // getTodayKey is the local key for "now".
  const fixedNow = new Date(2026, 5, 27, 15, 30, 0);
  assertEqual(getTodayKey(fixedNow), '2026-06-27', 'today key is the local date');

  // Day boundaries: start is local midnight, next boundary is the following local
  // midnight, and "now" falls inside [start, nextBoundary).
  const start = getDayStartMs(fixedNow);
  const next = getNextDayBoundaryMs(fixedNow);
  assertEqual(start, parseISODate('2026-06-27').getTime(), 'day start is local midnight');
  assertEqual(next, parseISODate('2026-06-28').getTime(), 'next boundary is the next local midnight');
  assert(start <= fixedNow.getTime() && fixedNow.getTime() < next, 'now is within the current day window');
  assertEqual(next - start, 24 * 60 * 60 * 1000, 'a day spans 24 hours (no DST edge in this fixture)');

  console.log('app-day-tests: all assertions passed');
}
