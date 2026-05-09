import {
  buildDailyOfferClaimStorageKey,
  runDailyOfferClaim,
  type DailyOfferClaimInFlightRef,
} from '../dailyOfferClaim';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

function assertArrayEqual<T>(actual: T[], expected: T[], message: string): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
  }
}

export async function runAllDailyOfferClaimTests(): Promise<void> {
  {
    const todayRowDayKey = '2026-05-09';
    const key = buildDailyOfferClaimStorageKey('zen_tree_water_claimed', 'user-1', todayRowDayKey);
    assertEqual(
      key,
      'lifegoal:zen_tree_water_claimed:user-1:2026-05-09',
      'claim storage key should use the supplied Today row day key',
    );
  }

  {
    const firstDayKey = buildDailyOfferClaimStorageKey('feed_creatures_claimed', 'user-1', '2026-05-09');
    const nextDayKey = buildDailyOfferClaimStorageKey('feed_creatures_claimed', 'user-1', '2026-05-10');
    assertEqual(
      firstDayKey === nextDayKey,
      false,
      'claim storage key should change when the central Today row day changes',
    );
  }

  {
    const events: string[] = [];
    const ref: DailyOfferClaimInFlightRef = { current: false };
    const result = await runDailyOfferClaim({
      isClaimed: false,
      isClaiming: false,
      inFlightRef: ref,
      award: () => {
        events.push('award');
      },
      markClaimed: () => {
        events.push('markClaimed');
      },
      closeModal: () => {
        events.push('closeModal');
      },
      setClaiming: (isClaiming) => {
        events.push(`claiming:${String(isClaiming)}`);
      },
      setError: (errorMessage) => {
        events.push(`error:${errorMessage ?? 'null'}`);
      },
      errorMessage: 'Unable to claim reward.',
    });

    assertEqual(result, true, 'successful claim should return true');
    assertEqual(ref.current, false, 'in-flight ref should reset after success');
    assertArrayEqual(
      events,
      ['claiming:true', 'error:null', 'award', 'markClaimed', 'closeModal', 'claiming:false'],
      'successful claim should mark claimed only after award returns',
    );
  }

  {
    const events: string[] = [];
    const ref: DailyOfferClaimInFlightRef = { current: false };
    const result = await runDailyOfferClaim({
      isClaimed: false,
      isClaiming: false,
      inFlightRef: ref,
      award: () => {
        events.push('award');
        throw new Error('Award failed');
      },
      markClaimed: () => {
        events.push('markClaimed');
      },
      closeModal: () => {
        events.push('closeModal');
      },
      setClaiming: (isClaiming) => {
        events.push(`claiming:${String(isClaiming)}`);
      },
      setError: (errorMessage) => {
        events.push(`error:${errorMessage ?? 'null'}`);
      },
      errorMessage: 'Unable to claim reward.',
    });

    assertEqual(result, false, 'failed claim should return false');
    assertEqual(ref.current, false, 'in-flight ref should reset after failure');
    assertArrayEqual(
      events,
      ['claiming:true', 'error:null', 'award', 'error:Award failed', 'claiming:false'],
      'failed claim should not mark claimed or close the modal',
    );
  }

  {
    const events: string[] = [];
    const ref: DailyOfferClaimInFlightRef = { current: false };
    const releaseAwardRef: { current: (() => void) | null } = { current: null };
    const award = () => new Promise<void>((resolve) => {
      events.push('award');
      releaseAwardRef.current = resolve;
    });

    const first = runDailyOfferClaim({
      isClaimed: false,
      isClaiming: false,
      inFlightRef: ref,
      award,
      markClaimed: () => {
        events.push('markClaimed');
      },
      closeModal: () => {
        events.push('closeModal');
      },
      setClaiming: (isClaiming) => {
        events.push(`claiming:${String(isClaiming)}`);
      },
      setError: (errorMessage) => {
        events.push(`error:${errorMessage ?? 'null'}`);
      },
      errorMessage: 'Unable to claim reward.',
    });
    const second = await runDailyOfferClaim({
      isClaimed: false,
      isClaiming: false,
      inFlightRef: ref,
      award,
      markClaimed: () => {
        events.push('markClaimed:second');
      },
      closeModal: () => {
        events.push('closeModal:second');
      },
      setClaiming: (isClaiming) => {
        events.push(`claimingSecond:${String(isClaiming)}`);
      },
      setError: (errorMessage) => {
        events.push(`errorSecond:${errorMessage ?? 'null'}`);
      },
      errorMessage: 'Unable to claim reward.',
    });

    assertEqual(second, false, 'duplicate same-tick claim should return false');
    assertEqual(events.filter((event) => event === 'award').length, 1, 'award should only be called once');
    if (!releaseAwardRef.current) {
      throw new Error('expected first award promise to expose a release callback');
    }
    releaseAwardRef.current();
    assertEqual(await first, true, 'first claim should eventually succeed');
  }
}
