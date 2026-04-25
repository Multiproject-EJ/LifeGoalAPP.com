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
import { awardDailyTreatDice } from '../../../../../services/dailyTreats';
import {
  STRICT_DAILY_SPIN_LIMIT,
  clampSpinsForStrictDailyLimit,
} from '../../../../../services/dailySpinLimit';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, hydrateIslandRunState } from '../islandRunStateStore';
import { assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'minigame-phase2-daily-treat-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      user_metadata: {},
    },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetRuntimeStateHarness(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

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
      __setIslandRunFeatureFlagsForTests({ todaysOfferSpinEntryEnabled: false });
      assertEqual(clampSpinsForStrictDailyLimit(0), 0, 'flag off: passthrough 0');
      assertEqual(clampSpinsForStrictDailyLimit(1), 1, 'flag off: passthrough 1');
      assertEqual(clampSpinsForStrictDailyLimit(2), 2, 'flag off: passthrough 2 (legacy all-habits-done bonus)');
      assertEqual(clampSpinsForStrictDailyLimit(3), 3, 'flag off: passthrough 3 (legacy streak bonus stacked)');
      __resetIslandRunFeatureFlagsForTests();
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
  {
    name: 'Daily Treat dice awards persist in Island Run dicePool across store reset + hydration',
    run: async () => {
      resetRuntimeStateHarness();
      const session = makeSession();
      const before = readIslandRunGameStateRecord(session).dicePool;

      awardDailyTreatDice({
        userId: USER_ID,
        diceAmount: 4,
        sourceLabel: 'LR2 regression guard',
        islandRunSession: session,
      });

      const afterAward = getIslandRunStateSnapshot(session);
      assertEqual(afterAward.dicePool, before + 4, 'daily treat dice should credit dicePool immediately');

      // Simulate reload: clear in-memory mirror then hydrate from persisted state.
      __resetIslandRunStateStoreForTests();
      const hydrated = await hydrateIslandRunState({ session, client: null });
      assertEqual(hydrated.record.dicePool, before + 4, 'hydrated state should keep credited dice delta');
    },
  },
];
