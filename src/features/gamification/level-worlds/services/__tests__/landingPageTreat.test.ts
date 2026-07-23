import {
  LANDING_PAGE_TREAT_CLAIMED_KEY,
  LANDING_PAGE_TREAT_DICE,
  LANDING_PAGE_TREAT_PENDING_KEY,
  consumePendingLandingPageTreat,
  landingPageTreatDayKey,
} from '../../../../../services/landingPageTreat';
import { assertEqual, createMemoryStorage, type TestCase } from './testHarness';

export const landingPageTreatTests: TestCase[] = [
  {
    name: 'demo landing treat consumes one matching daily handoff',
    run: () => {
      const now = new Date(2026, 6, 23, 12, 0, 0);
      const dayKey = landingPageTreatDayKey(now);
      const storage = createMemoryStorage({
        [LANDING_PAGE_TREAT_PENDING_KEY]: dayKey,
      });

      assertEqual(
        consumePendingLandingPageTreat({ storage, now }),
        LANDING_PAGE_TREAT_DICE,
        'Expected one demo landing-page dice grant',
      );
      assertEqual(storage.getItem(LANDING_PAGE_TREAT_CLAIMED_KEY), dayKey, 'Expected claim day to persist');
      assertEqual(
        consumePendingLandingPageTreat({ storage, now }),
        0,
        'Expected repeated claim on the same day to grant nothing',
      );
    },
  },
  {
    name: 'demo landing treat rejects stale pending day',
    run: () => {
      const storage = createMemoryStorage({
        [LANDING_PAGE_TREAT_PENDING_KEY]: '2026-07-22',
      });
      assertEqual(
        consumePendingLandingPageTreat({ storage, now: new Date(2026, 6, 23, 12, 0, 0) }),
        0,
        'Expected stale web handoff to grant nothing',
      );
    },
  },
];
