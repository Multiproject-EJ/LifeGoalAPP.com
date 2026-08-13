import { buildTimeLimitedOfferExpiryDedupeKey } from '../timeLimitedOfferTelemetry';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runAllTimeLimitedOfferTelemetryTests(): void {
  const firstMountKey = buildTimeLimitedOfferExpiryDedupeKey({
    offerDate: '2026-08-10',
    windowEnd: 1786380000123.9,
  });
  const remountKey = buildTimeLimitedOfferExpiryDedupeKey({
    offerDate: '2026-08-10',
    windowEnd: 1786380000123.9,
  });

  assertEqual(
    firstMountKey,
    remountKey,
    'the same expired offer should keep one database dedupe key across remounts',
  );
  assertEqual(
    firstMountKey,
    'offer-expired:2026-08-10:1786380000123',
    'the dedupe key should contain only stable offer-window identity',
  );
}
