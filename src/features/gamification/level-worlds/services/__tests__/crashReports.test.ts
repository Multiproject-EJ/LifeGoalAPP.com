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
import { wrapStationIndex } from '../../dev/RobotConstructionTheatre';
import { groupCrashReports, normaliseTopFrame, summariseCrashDiagnostics } from '../../../../../services/crashReportGroups';
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
  {
    name: 'reported crash: construction crew station index stays valid after long builds with a negative step',
    run: () => {
      // Field reports: "undefined is not an object (evaluating 'x2.position')"
      // every frame after minutes of building (stationStep -1 kept shifting).
      for (const shift of [0, -1, -7, -40, -1000, 1000]) {
        const index = wrapStationIndex(3 + shift, 6);
        assert(Number.isInteger(index) && index >= 0 && index < 6, `shift ${shift} → ${index}`);
      }
      assertEqual(wrapStationIndex(-1, 6), 5, 'wraps backwards');
      assertEqual(wrapStationIndex(Number.NaN, 6), 0, 'never NaN');
      assertEqual(wrapStationIndex(4, 0), 0, 'empty ring is safe');
    },
  },
  {
    name: 'crash capture: a crash repeating every frame is one entry with a repeat count',
    run: () => {
      clearRecentCrashes();
      const error = new TypeError("undefined is not an object (evaluating 'x2.position')");
      for (let i = 0; i < 40; i += 1) captureCrash({ error, surface: 'window' });
      captureCrash({ error: new Error('something else'), surface: 'window' });
      const recent = getRecentCrashes();
      assertEqual(recent.length, 2, 'distinct crashes only');
      assertEqual(recent[0]!.repeatCount, 40, 'repeats are counted');
      clearRecentCrashes();
    },
  },
  {
    name: 'crash triage: the same bug across builds, islands and minified names is one group; resolved reports stop counting as open',
    run: () => {
      const report = (id: string, userId: string, build: string, variable: string, island: number, status = 'new', at = '2026-10-02T00:00:00Z') => ({
        id, user_id: userId, category: 'crash_report', status, created_at: at, subject: 'Crash',
        metadata: {
          appVersion: build, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', viewport: '390x844@3', msSinceLoad: 263120,
          context: { islandRun: { islandNumber: island } },
          crashes: [{ message: `undefined is not an object (evaluating '${variable}.position')`, surface: 'window', repeatCount: 40,
            stack: `@capacitor://localhost/assets/Island5ThreePilot-${build}.js:36:113337\nforEach@[native code]\nupdate@capacitor://localhost/assets/Island5ThreePilot-${build}.js:36:112046` }],
        },
      });
      const groups = groupCrashReports([
        report('a', 'u1', 'D6ljorJL', 'x2', 7),
        report('b', 'u1', 'D6ljorJL', 'x2', 8, 'new', '2026-10-02T00:29:00Z'),
        report('c', 'u2', 'B1WGM4_W', 'q9', 19, 'resolved', '2026-10-02T13:00:00Z'),
        { id: 'd', user_id: 'u3', category: 'bug', status: 'new', created_at: '2026-10-02T00:00:00Z', subject: 'Other', metadata: null },
        { ...report('e', 'u3', 'D6ljorJL', 'x2', 3), metadata: { crashes: [{ message: 'Other failure', stack: 'at render (https://lifegoalapp.com/assets/Today-AbC12345.js:1:2)' }] } },
      ]);
      assertEqual(groups.length, 2, 'two distinct crashes; non-crash cases ignored');
      const top = groups[0]!;
      assertEqual(top.threadIds.length, 3, 'one bug across two builds and minified names');
      assertEqual(top.openThreadIds.length, 2, 'resolved reports are not open');
      assertEqual(top.players, 2, 'distinct players');
      assertEqual(top.islands.join(','), '7,8,19', 'islands seen');
      assertEqual(top.totalRepeats, 120, 'per-frame repeats add up');
      assertEqual(top.topFrame, '@Island5ThreePilot', 'top frame without hash or position');
      assertEqual(normaliseTopFrame('TypeError: x\n    at render (https://lifegoalapp.com/assets/Today-AbC12345.js:1:2)'), 'render Today', 'Chrome frames too');
      const summary = summariseCrashDiagnostics(report('a', 'u1', 'D6ljorJL', 'x2', 7).metadata);
      assertEqual(summary.device, 'iOS', 'device family only');
      assertEqual(summary.island, 7, 'island context');
      assertEqual(summary.crashes[0]!.repeats, 40, 'repeat count shown');
    },
  },
];
