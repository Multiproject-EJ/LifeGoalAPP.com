import { assert, assertEqual, type TestCase } from './testHarness';
import {
  createPlayerActivityTracker,
  PLAYER_ACTIVITY_MAX_TICK_MS,
  PLAYER_SESSION_GAP_MS,
} from '../../../../../services/playerActivity';
import {
  buildPlayerInsightsDigest,
  cohortRate,
  findBiggestDrop,
  findFunDip,
  type PlayerInsights,
} from '../../../../../services/playerInsights';

const snap = (island: number, token: number, spent = 0, cycle = 0) => ({
  currentIslandNumber: island, cycleIndex: cycle, tokenIndex: token, essenceLifetimeSpent: spent,
});

export const playerInsightsTests: TestCase[] = [
  {
    name: 'player activity: rolls, builds and island clears are counted from the record, read-only',
    run: () => {
      const tracker = createPlayerActivityTracker(0);
      tracker.observe(snap(3, 0));
      tracker.observe(snap(3, 4));
      tracker.observe(snap(3, 9));
      tracker.observe(snap(3, 9, 50));
      tracker.observe(snap(4, 0, 50));
      tracker.observe(snap(4, 0, 50));
      const delta = tracker.drain('2026-09-27')!;
      assertEqual(delta.rolls, 2, 'two token moves on the same island');
      assertEqual(delta.builds, 1, 'one essence spend');
      assertEqual(delta.islandsCompleted, 1, 'moving to island 4 clears island 3');
      assertEqual(delta.island, 4, 'reports the latest island');
      assertEqual(delta.sessions, 1, 'the first flush carries the opening session');
      assertEqual(tracker.drain('2026-09-27'), null, 'nothing new: nothing to send');
    },
  },
  {
    name: 'player activity: only visible time counts, a sleeping device cannot add hours, long gaps start a session',
    run: () => {
      const tracker = createPlayerActivityTracker(0);
      tracker.observe(snap(1, 0));
      tracker.tick(15_000, true);
      tracker.tick(30_000, false);
      tracker.tick(10 * 60_000, true);
      const first = tracker.drain('d')!;
      assertEqual(first.activeSeconds, 15 + PLAYER_ACTIVITY_MAX_TICK_MS / 1000, 'hidden time skipped, one long tick capped');
      tracker.hide(11 * 60_000);
      tracker.resume(11 * 60_000 + PLAYER_SESSION_GAP_MS);
      tracker.tick(11 * 60_000 + PLAYER_SESSION_GAP_MS + 5_000, true);
      const second = tracker.drain('d')!;
      assertEqual(second.sessions, 1, 'coming back after 30+ minutes is a new session');
      tracker.hide(0);
      tracker.resume(60_000);
      tracker.tick(70_000, true);
      assertEqual(tracker.drain('d')!.sessions, 0, 'a quick app switch is the same session');
    },
  },
  {
    name: 'player insights: biggest drop, fun dip and immature cohorts',
    run: () => {
      const funnel = [
        { island: 1, reached: 60, here: 10, lost: 3, median_days_here: 1 },
        { island: 2, reached: 50, here: 8, lost: 3, median_days_here: 1 },
        { island: 6, reached: 20, here: 12, lost: 9, median_days_here: 3 },
        { island: 9, reached: 2, here: 2, lost: 2, median_days_here: 2 },
      ];
      const drop = findBiggestDrop(funnel)!;
      assertEqual(drop.island, 6, 'island 6 loses the largest share; island 9 is too small a sample');
      const fun = [1, 2, 3, 4, 5, 6, 7].map((island) => ({
        island, player_days: 20, players: 10, avg_minutes: island >= 6 ? 4.5 : 15,
        avg_rolls: 50, avg_sessions: 2, avg_builds: 3,
      }));
      assertEqual(findFunDip(fun)!.island, 6, 'play time collapses at island 6');
      assertEqual(findFunDip(fun.map((row) => ({ ...row, avg_minutes: 12 }))), null, 'flat curve: no dip');
      const young = { week: '2026-09-21', size: 10, d1: 4, d7: 0, d30: 0, age_days: 3 };
      assertEqual(cohortRate(young, 'd1'), 0.4, 'next-day rate');
      assertEqual(cohortRate(young, 'd7'), null, 'too young for day 7');
      const digest = buildPlayerInsightsDigest({
        lookback_days: 30, generated_at: '', funnel, fun, cohorts: [young], daily: [],
        summary: { players: 60, active_1d: 5, active_7d: 20, active_30d: 60, new_7d: 10, finished_all: 0 },
      } as PlayerInsights);
      assert(digest.includes('island 6') && digest.includes('Fun dip'), 'digest names the problem islands');
    },
  },
  {
    name: 'player insights: the activity table is RPC-only, clamped, and the aggregate is admin-only',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const sql = fsMod.readFileSync('supabase/migrations/20260927170000_player_insights.sql', 'utf8');
      assert(sql.includes('REVOKE ALL ON TABLE public.player_activity_days FROM PUBLIC, anon, authenticated'), 'no direct client access');
      assert(sql.includes("ABS(p_day - (now() AT TIME ZONE 'utc')::DATE) > 1"), 'clients can only write around today');
      assert(/v_seconds INTEGER := LEAST\(GREATEST\(COALESCE\(p_active_seconds, 0\), 0\), 900\)/.test(sql), 'per-flush time is clamped');
      assert(sql.includes('public.admin_users') && sql.includes("RAISE EXCEPTION 'Admin access required'"), 'insights are admin-gated');
      assert(!/GRANT EXECUTE ON FUNCTION public\.\w+\([^)]*\) TO anon/.test(sql), 'nothing is granted to anon');
      const app = fsMod.readFileSync('src/App.tsx', 'utf8');
      assert(app.includes('usePlayerActivityHeartbeat('), 'the heartbeat runs while the app is open');
      const hook = fsMod.readFileSync('src/features/gamification/level-worlds/hooks/usePlayerActivityHeartbeat.ts', 'utf8');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState/.test(hook), 'the heartbeat only reads gameplay state');
    },
  },
];
