import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getAdminTelemetryInsights,
  listRecentTelemetryEventsForAdmin,
  listTelemetryDailyRollups,
  type AdminTelemetryInsights,
  type RecentTelemetryEventRow,
  type TelemetryDailyRollupRow,
} from '../../services/adminTelemetry';
import { isAdminUser } from '../../services/adminRoles';

type Props = {
  session: Session;
};

type LookbackDays = 7 | 30 | 90;

const LOOKBACK_OPTIONS: LookbackDays[] = [7, 30, 90];

const BAR_COLOR = '#6366f1';

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 'No data';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function AdminTelemetryPanel({ session }: Props) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookback, setLookback] = useState<LookbackDays>(30);
  const [rollups, setRollups] = useState<TelemetryDailyRollupRow[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentTelemetryEventRow[]>([]);
  const [insights, setInsights] = useState<AdminTelemetryInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    isAdminUser(session.user.id).then((value) => {
      if (!active) return;
      setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const since = new Date();
    since.setDate(since.getDate() - lookback);

    const [rollupResult, recentResult, insightResult] = await Promise.all([
      listTelemetryDailyRollups({ sinceISODate: toISODate(since) }),
      listRecentTelemetryEventsForAdmin({ limit: 20 }),
      getAdminTelemetryInsights({ lookbackDays: lookback }),
    ]);

    const firstError = rollupResult.error ?? recentResult.error ?? insightResult.error;
    if (firstError) setError(firstError.message);

    setRollups(rollupResult.data);
    setRecentEvents(recentResult.data);
    setInsights(insightResult.data);
    setLoading(false);
  }, [lookback]);

  useEffect(() => {
    if (isAdmin !== true) return;
    void loadData();
  }, [isAdmin, loadData]);

  const dailySeries = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const row of rollups) {
      byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.event_count);
    }
    return Array.from(byDay.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [rollups]);

  const byType = useMemo(() => {
    const map = new Map<string, { count: number; uniqueUsers: number }>();
    for (const row of rollups) {
      const bucket = map.get(row.event_type) ?? { count: 0, uniqueUsers: 0 };
      bucket.count += row.event_count;
      bucket.uniqueUsers = Math.max(bucket.uniqueUsers, row.unique_users);
      map.set(row.event_type, bucket);
    }
    return Array.from(map.entries())
      .map(([eventType, bucket]) => ({ eventType, ...bucket }))
      .sort((a, b) => b.count - a.count);
  }, [rollups]);

  const totalEvents = useMemo(() => byType.reduce((sum, row) => sum + row.count, 0), [byType]);
  const busiestDay = useMemo(
    () => dailySeries.reduce<{ day: string; count: number } | null>(
      (best, point) => (best === null || point.count > best.count ? point : best),
      null,
    ),
    [dailySeries],
  );
  const maxDailyCount = busiestDay?.count ?? 0;
  const decisionSignals = useMemo(() => {
    if (!insights) return [];
    const signals: Array<{ severity: number; label: string }> = [];
    const habitAttempts = insights.habit_successes + insights.habit_struggles;
    const rollAttempts = insights.island_rolls + insights.island_roll_blocks;
    const hydrationAttempts = insights.hydrations + insights.hydration_failures;
    const habitStruggleRate = habitAttempts > 0 ? insights.habit_struggles / habitAttempts : 0;
    const rollBlockRate = rollAttempts > 0 ? insights.island_roll_blocks / rollAttempts : 0;
    const hydrationFailureRate = hydrationAttempts > 0 ? insights.hydration_failures / hydrationAttempts : 0;
    const returnRate = insights.active_users > 0 ? insights.returning_users / insights.active_users : 0;

    if (habitAttempts > 0 && habitStruggleRate >= 0.25) {
      signals.push({ severity: habitStruggleRate, label: `${formatRate(insights.habit_struggles, habitAttempts)} of habit outcomes are skips or misses — review habit difficulty and recovery prompts.` });
    }
    if (rollAttempts > 0 && rollBlockRate >= 0.1) {
      signals.push({ severity: rollBlockRate, label: `${formatRate(insights.island_roll_blocks, rollAttempts)} of Island Run roll attempts are blocked — inspect dice availability and purchase prompts.` });
    }
    if (hydrationAttempts > 0 && hydrationFailureRate >= 0.02) {
      signals.push({ severity: hydrationFailureRate, label: `${formatRate(insights.hydration_failures, hydrationAttempts)} of runtime hydrations fail — prioritise sync reliability.` });
    }
    if (insights.active_users > 0 && returnRate < 0.4) {
      signals.push({ severity: 1 - returnRate, label: `Only ${formatRate(insights.returning_users, insights.active_users)} of active players used the app on multiple days — inspect early-session drop-off.` });
    }
    if (insights.lapsed_users > 0) {
      signals.push({ severity: 0.5, label: `${insights.lapsed_users.toLocaleString()} telemetry-enabled player${insights.lapsed_users === 1 ? '' : 's'} were active in the last month but not the last 7 days.` });
    }
    return signals.sort((a, b) => b.severity - a.severity);
  }, [insights]);

  if (isAdmin === null) {
    return <p className="account-panel__hint">Checking admin access…</p>;
  }

  if (!isAdmin) {
    return <p className="account-panel__hint">Admin access required.</p>;
  }

  return (
    <div>
      <div className="account-panel__actions-row" role="group" aria-label="Telemetry lookback window">
        {LOOKBACK_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className="btn"
            aria-pressed={lookback === option}
            style={lookback === option ? { fontWeight: 700, textDecoration: 'underline' } : undefined}
            onClick={() => setLookback(option)}
          >
            Last {option} days
          </button>
        ))}
        <button type="button" className="btn" onClick={() => void loadData()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="account-panel__hint">Could not load telemetry: {error}</p> : null}

      {insights ? (
        <>
          <h4 style={{ margin: '1rem 0 0.5rem' }}>Player health</h4>
          <dl className="account-panel__details account-panel__details--grid">
            <div>
              <dt>Active players</dt>
              <dd>{insights.active_users.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Returned another day</dt>
              <dd>{formatRate(insights.returning_users, insights.active_users)}</dd>
            </div>
            <div>
              <dt>Lapsed (7+ days)</dt>
              <dd>{insights.lapsed_users.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Habit struggle rate</dt>
              <dd>{formatRate(insights.habit_struggles, insights.habit_successes + insights.habit_struggles)}</dd>
            </div>
            <div>
              <dt>Offer claim rate</dt>
              <dd>{formatRate(insights.offers_claimed, insights.offers_scheduled)}</dd>
            </div>
            <div>
              <dt>Island roll blocked</dt>
              <dd>{formatRate(insights.island_roll_blocks, insights.island_rolls + insights.island_roll_blocks)}</dd>
            </div>
            <div>
              <dt>State sync failures</dt>
              <dd>{formatRate(insights.hydration_failures, insights.hydrations + insights.hydration_failures)}</dd>
            </div>
          </dl>

          <h4 style={{ margin: '1rem 0 0.5rem' }}>Signals to act on</h4>
          {decisionSignals.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {decisionSignals.map((signal) => <li key={signal.label}>{signal.label}</li>)}
            </ul>
          ) : (
            <p className="account-panel__hint">No threshold alerts in this window. “No data” means the event has only just been instrumented.</p>
          )}
        </>
      ) : null}

      <dl className="account-panel__details account-panel__details--grid" style={{ marginTop: '0.75rem' }}>
        <div>
          <dt>Events (last {lookback} days)</dt>
          <dd>{totalEvents.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Event types</dt>
          <dd>{byType.length}</dd>
        </div>
        <div>
          <dt>Active days</dt>
          <dd>{dailySeries.length}</dd>
        </div>
        <div>
          <dt>Busiest day</dt>
          <dd>{busiestDay ? `${formatDay(busiestDay.day)} (${busiestDay.count.toLocaleString()})` : 'No data'}</dd>
        </div>
      </dl>

      {dailySeries.length > 0 ? (
        <figure style={{ margin: '1rem 0 0' }}>
          <figcaption className="account-panel__hint" style={{ marginBottom: '0.5rem' }}>
            Events per day
          </figcaption>
          <div
            role="img"
            aria-label={`Events per day for the last ${lookback} days; busiest day ${
              busiestDay ? `${formatDay(busiestDay.day)} with ${busiestDay.count} events` : 'none'
            }`}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 2,
              height: 120,
              padding: '0.25rem 0',
            }}
          >
            {dailySeries.map((point) => (
              <div
                key={point.day}
                title={`${formatDay(point.day)}: ${point.count.toLocaleString()} events`}
                style={{
                  flex: 1,
                  minWidth: 3,
                  height: maxDailyCount > 0 ? `${Math.max(4, Math.round((point.count / maxDailyCount) * 100))}%` : 4,
                  background: BAR_COLOR,
                  borderRadius: '4px 4px 0 0',
                }}
              />
            ))}
          </div>
        </figure>
      ) : (
        <p className="account-panel__hint" style={{ marginTop: '1rem' }}>
          No telemetry rollups in this window yet. Rollups build nightly; use Refresh after the first
          rollup job has run, or record some events with telemetry enabled.
        </p>
      )}

      {byType.length > 0 ? (
        <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <caption className="account-panel__hint" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
              Events by type (last {lookback} days)
            </caption>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem 0.25rem 0' }}>Event type</th>
                <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Count</th>
                <th style={{ textAlign: 'right', padding: '0.25rem 0 0.25rem 0.5rem' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {byType.slice(0, 15).map((row) => (
                <tr key={row.eventType}>
                  <td style={{ padding: '0.25rem 0.5rem 0.25rem 0', fontFamily: 'monospace' }}>{row.eventType}</td>
                  <td style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>{row.count.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '0.25rem 0 0.25rem 0.5rem' }}>
                    {totalEvents > 0 ? `${Math.round((row.count / totalEvents) * 100)}%` : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {byType.length > 15 ? (
            <p className="account-panel__hint">Showing top 15 of {byType.length} event types.</p>
          ) : null}
        </div>
      ) : null}

      {recentEvents.length > 0 ? (
        <div style={{ marginTop: '1rem' }}>
          <p className="account-panel__hint" style={{ marginBottom: '0.5rem' }}>
            Most recent raw events (live, before nightly rollup)
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.875rem' }}>
            {recentEvents.map((event) => (
              <li key={event.id}>
                <span style={{ fontFamily: 'monospace' }}>{event.event_type}</span>
                {' — '}
                {formatDateTime(event.occurred_at)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
