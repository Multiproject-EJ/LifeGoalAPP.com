/**
 * Phase 2 consolidation-plan tests: strict-1/day Daily Spin clamp.
 * See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §2.4 and §12 Phase 2.
 *
 * The module under test (`services/dailySpinLimit.ts`) is deliberately free
 * of Supabase / `import.meta.env` imports so it compiles in the island-run
 * test harness without any extra wiring.
 */
import {
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import {
  STRICT_DAILY_SPIN_LIMIT,
  clampSpinsForStrictDailyLimit,
} from '../../../../../services/dailySpinLimit';
import { assertEqual, type TestCase } from './testHarness';

export const minigameConsolidationPhase2Tests: TestCase[] = [
  {
    name: 'STRICT_DAILY_SPIN_LIMIT is the contract value (1)',
    run: () => {
      assertEqual(STRICT_DAILY_SPIN_LIMIT, 1, 'plan §2.4 enforces "one spin per day, max"');
    },
  },
  {
    name: 'clampSpinsForStrictDailyLimit is a no-op when the flag is OFF',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      assertEqual(clampSpinsForStrictDailyLimit(0), 0, 'flag off: passthrough 0');
      assertEqual(clampSpinsForStrictDailyLimit(1), 1, 'flag off: passthrough 1');
      assertEqual(clampSpinsForStrictDailyLimit(2), 2, 'flag off: passthrough 2 (legacy all-habits-done bonus)');
      assertEqual(clampSpinsForStrictDailyLimit(3), 3, 'flag off: passthrough 3 (legacy streak bonus stacked)');
    },
  },
  {
    name: 'clampSpinsForStrictDailyLimit clamps to 1 when the flag is ON',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ todaysOfferSpinEntryEnabled: true });
      assertEqual(clampSpinsForStrictDailyLimit(0), 0, 'flag on: 0 stays 0');
      assertEqual(clampSpinsForStrictDailyLimit(1), 1, 'flag on: 1 stays 1');
      assertEqual(clampSpinsForStrictDailyLimit(2), 1, 'flag on: 2 clamps to 1 (all-habits bonus retired)');
      assertEqual(clampSpinsForStrictDailyLimit(3), 1, 'flag on: 3 clamps to 1 (streak bonus retired)');
      __resetIslandRunFeatureFlagsForTests();
    },
  },
  {
    name: 'clampSpinsForStrictDailyLimit sanitizes non-finite / negative / fractional inputs when the flag is ON',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ todaysOfferSpinEntryEnabled: true });
      assertEqual(clampSpinsForStrictDailyLimit(Number.NaN), 0, 'NaN → 0');
      assertEqual(clampSpinsForStrictDailyLimit(Number.POSITIVE_INFINITY), 0, 'Infinity → 0 (non-finite treated as invalid)');
      assertEqual(clampSpinsForStrictDailyLimit(-5), 0, 'negative → 0');
      assertEqual(clampSpinsForStrictDailyLimit(1.9), 1, 'fractional floored then clamped');
      __resetIslandRunFeatureFlagsForTests();
    },
  },
];
