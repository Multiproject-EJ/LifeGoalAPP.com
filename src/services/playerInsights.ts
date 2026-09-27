/**
 * Player insights — admin-only read of where players stop and where the fun
 * drops, plus pure helpers that turn the aggregate into plain callouts.
 * Data comes from `get_admin_player_insights` (admin_users gated server-side).
 */
import { getSupabaseClient } from '../lib/supabaseClient';

export type PlayerInsightsFunnelRow = {
  island: number;
  reached: number;
  here: number;
  lost: number;
  median_days_here: number | null;
};

export type PlayerInsightsFunRow = {
  island: number;
  player_days: number;
  players: number;
  avg_minutes: number;
  avg_rolls: number;
  avg_sessions: number;
  avg_builds: number;
};

export type PlayerInsightsCohortRow = {
  week: string;
  size: number;
  d1: number;
  d7: number;
  d30: number;
  age_days: number;
};

export type PlayerInsightsDailyRow = { day: string; active: number; new_players: number };

export type PlayerInsights = {
  lookback_days: number;
  generated_at: string;
  summary: {
    players: number;
    active_1d: number;
    active_7d: number;
    active_30d: number;
    new_7d: number;
    finished_all: number;
  };
  funnel: PlayerInsightsFunnelRow[];
  fun: PlayerInsightsFunRow[];
  cohorts: PlayerInsightsCohortRow[];
  daily: PlayerInsightsDailyRow[];
};

export async function fetchPlayerInsights(lookbackDays: number): Promise<{ data: PlayerInsights | null; error: Error | null }> {
  try {
    // The RPC ships with this feature; generated types pick it up on the next codegen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = getSupabaseClient() as any;
    const { data, error } = await client.rpc('get_admin_player_insights', { p_days: lookbackDays });
    if (error) throw error;
    return { data: (data as PlayerInsights | null) ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Failed to load player insights.') };
  }
}

export type DropCallout = { island: number; lost: number; reached: number; lossRate: number };

/** The island where the largest share of the players who reached it are now lost. */
export function findBiggestDrop(funnel: PlayerInsightsFunnelRow[], minReached = 3): DropCallout | null {
  let best: DropCallout | null = null;
  for (const row of funnel) {
    if (row.reached < minReached || row.lost <= 0) continue;
    const lossRate = row.lost / row.reached;
    if (!best || lossRate > best.lossRate || (lossRate === best.lossRate && row.lost > best.lost)) {
      best = { island: row.island, lost: row.lost, reached: row.reached, lossRate };
    }
  }
  return best;
}

export type FunDipCallout = { island: number; minutesBefore: number; minutesAt: number; dropRate: number };

/**
 * The island where daily play time falls most against the two islands
 * before it: the clearest "fun stops here" signal in the data.
 */
export function findFunDip(fun: PlayerInsightsFunRow[], minPlayerDays = 5): FunDipCallout | null {
  const rows = fun.filter((row) => row.player_days >= minPlayerDays).sort((a, b) => a.island - b.island);
  let best: FunDipCallout | null = null;
  for (let index = 1; index < rows.length; index += 1) {
    const before = rows.slice(Math.max(0, index - 2), index);
    const minutesBefore = before.reduce((sum, row) => sum + row.avg_minutes, 0) / before.length;
    if (minutesBefore <= 0) continue;
    const dropRate = (minutesBefore - rows[index].avg_minutes) / minutesBefore;
    if (dropRate > 0.15 && (!best || dropRate > best.dropRate)) {
      best = { island: rows[index].island, minutesBefore, minutesAt: rows[index].avg_minutes, dropRate };
    }
  }
  return best;
}

/** Retention share, or null while the cohort is too young to have had the chance. */
export function cohortRate(cohort: PlayerInsightsCohortRow, key: 'd1' | 'd7' | 'd30'): number | null {
  const minAge = key === 'd1' ? 1 : key === 'd7' ? 7 : 30;
  if (cohort.size <= 0 || cohort.age_days < minAge) return null;
  return cohort[key] / cohort.size;
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

/** Plain-text digest for pasting into notes or chat. */
export function buildPlayerInsightsDigest(insights: PlayerInsights): string {
  const { summary } = insights;
  const drop = findBiggestDrop(insights.funnel);
  const dip = findFunDip(insights.fun);
  const lines = [
    `Player insights (last ${insights.lookback_days} days)`,
    `Players ${summary.players} · active today ${summary.active_1d} · active 7d ${summary.active_7d} · new 7d ${summary.new_7d}`,
    drop
      ? `Biggest drop: island ${drop.island}: ${drop.lost} of ${drop.reached} who reached it are gone (${formatPercent(drop.lossRate)})`
      : 'Biggest drop: not enough data yet',
    dip
      ? `Fun dip: island ${dip.island}: play time ${dip.minutesBefore.toFixed(1)} → ${dip.minutesAt.toFixed(1)} min/day (−${formatPercent(dip.dropRate)})`
      : 'Fun dip: none detected',
  ];
  const latest = insights.cohorts.find((cohort) => cohortRate(cohort, 'd1') !== null);
  if (latest) {
    lines.push(`Newest measurable cohort (${latest.week}, ${latest.size} players): D1 ${formatPercent(cohortRate(latest, 'd1'))} · D7+ ${formatPercent(cohortRate(latest, 'd7'))}`);
  }
  return lines.join('\n');
}
