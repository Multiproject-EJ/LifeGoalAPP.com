import type { Session } from '@supabase/supabase-js';
import {
  buildCrashDiagnostics,
  captureCrash,
  clearRecentCrashes,
  getRecentCrashes,
  isIgnorableCrash,
  queueCrashReportForLater,
  takePendingCrashReports,
} from '../../../../../services/crashReports';
import { applyCrashReportThankYouDice } from '../islandRunCrashReportRewardAction';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const makeSession = () => ({ user: { id: 'crash-report-test-user', user_metadata: {} } } as unknown as Session);

export const crashReportsTests: TestCase[] = [
  {
    name: 'captures crashes with bounded stacks, keeps the last five, and skips browser noise',
    run: () => {
      clearRecentCrashes();
      assert(isIgnorableCrash('ResizeObserver loop limit exceeded'), 'ResizeObserver noise is not a crash');
      assertEqual(captureCrash({ error: new Error('ResizeObserver loop completed'), surface: 'window' }), null, 'noise is dropped');
      const long = new Error('boom');
      long.stack = 'x'.repeat(10_000);
      const crash = captureCrash({ error: long, surface: 'level_worlds', componentStack: 'y'.repeat(5_000) });
      assert(crash !== null && crash.stack.length < 3_100 && crash.componentStack.length < 2_100, 'stacks are truncated');
      for (let i = 0; i < 7; i += 1) captureCrash({ error: new Error(`e${i}`), surface: 'window' });
      assertEqual(getRecentCrashes().length, 5, 'only the last five crashes are kept');
      assertEqual(getRecentCrashes()[4].message, 'e6', 'newest last');
      const diagnostics = buildCrashDiagnostics();
      for (const key of ['appVersion', 'userAgent', 'viewport', 'route', 'crashes', 'context']) {
        assert(key in diagnostics, `diagnostics include ${key}`);
      }
      clearRecentCrashes();
    },
  },
  {
    name: 'the thank-you dice are applied once per granted report through the canonical commit',
    run: async () => {
      resetIslandRunRuntimeCommitCoordinatorForTests();
      __resetIslandRunActionMutexesForTests();
      __resetIslandRunStateStoreForTests();
      installWindowWithStorage(createMemoryStorage());
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      await writeIslandRunGameStateRecord({ session, client: null, record: { ...base, dicePool: 30 } });
      refreshIslandRunStateFromLocal(session);
      const first = await applyCrashReportThankYouDice({ session, client: null, threadId: 'thread-1', amount: 20 });
      assert(first.applied, 'a granted report adds dice');
      assertEqual(first.record.dicePool, 50, '+20 dice');
      const again = await applyCrashReportThankYouDice({ session, client: null, threadId: 'thread-1', amount: 20 });
      assert(!again.applied, 'the same report never pays twice');
      assertEqual(again.record.dicePool, 50, 'dice unchanged on repeat');
    },
  },
  {
    name: 'the server owns the reward: fixed amount, once per user per day, capped reports',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const sql = fsMod.readFileSync('supabase/migrations/20260927100000_crash_report_rewards.sql', 'utf8');
      assert(sql.includes('PRIMARY KEY (user_id, reward_day)'), 'one reward row per user per day');
      assert(sql.includes('ON CONFLICT (user_id, reward_day) DO NOTHING'), 'repeat reports the same day grant nothing');
      assert(sql.includes('v_amount CONSTANT INTEGER := 20;'), 'the amount is fixed server-side');
      assert(sql.includes("IF v_reports_today >= 10 THEN"), 'reports are capped per day');
      assert(sql.includes('REVOKE ALL ON FUNCTION public.submit_crash_report'), 'no public execute');
      assert(sql.includes('GRANT EXECUTE ON FUNCTION public.submit_crash_report(TEXT, TEXT, JSONB, TEXT, BOOLEAN) TO authenticated;'), 'signed-in players only');
    },
  },
  {
    name: 'a guest report waits on the device (max three) and is handed over once',
    run: () => {
      installWindowWithStorage(createMemoryStorage());
      // @ts-ignore test harness exposes the stub storage on the global window
      (globalThis as { localStorage?: unknown }).localStorage = (globalThis as { window: { localStorage: unknown } }).window.localStorage;
      takePendingCrashReports();
      for (let i = 0; i < 5; i += 1) queueCrashReportForLater({ note: `note ${i}`, includeDiagnostics: false });
      const pending = takePendingCrashReports();
      assertEqual(pending.length, 3, 'only the latest three are kept');
      assertEqual(pending[2].note, 'note 4', 'newest last');
      assertEqual(takePendingCrashReports().length, 0, 'handed over exactly once');
    },
  },
];
