import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchReminderAnalyticsSummary,
  fetchReminderAnalyticsDaily,
  formatPercentage,
  formatChartDate,
  type ReminderAnalyticsSummary,
  type ReminderAnalyticsDaily,
} from '../../services/reminderAnalytics';
import { isDemoSession } from '../../services/demoSession';

type Props = {
  session: Session;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

export function ReminderAnalyticsDashboard({ session }: Props) {
  const isDemoExperience = isDemoSession(session);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReminderAnalyticsSummary | null>(null);
  const [daily, setDaily] = useState<ReminderAnalyticsDaily[]>([]);
  const [status, setStatus] = useState<StatusState>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [rangeDays, setRangeDays] = useState<7 | 30>(30);

  // Load analytics when expanded
  useEffect(() => {
    if (!isExpanded) return;

    let active = true;
    setLoading(true);
    setStatus(null);

    Promise.all([
      fetchReminderAnalyticsSummary(rangeDays),
      fetchReminderAnalyticsDaily(rangeDays),
    ])
      .then(([summaryResult, dailyResult]) => {
        if (!active) return;

        if (summaryResult.error) {
          console.error('Failed to load analytics summary:', summaryResult.error);
          setStatus({ kind: 'error', message: 'Unable to load analytics summary.' });
        } else if (summaryResult.data) {
          setSummary(summaryResult.data);
        }

        if (dailyResult.error) {
          console.error('Failed to load daily analytics:', dailyResult.error);
        } else if (dailyResult.data) {
          setDaily(dailyResult.data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.user.id, isExpanded, rangeDays]);

  const handleRefresh = async () => {
    setLoading(true);
    setStatus(null);

    const [summaryResult, dailyResult] = await Promise.all([
      fetchReminderAnalyticsSummary(rangeDays),
      fetchReminderAnalyticsDaily(rangeDays),
    ]);

    setLoading(false);

    if (summaryResult.error) {
      setStatus({ kind: 'error', message: 'Failed to refresh analytics.' });
      return;
    }

    if (summaryResult.data) {
      setSummary(summaryResult.data);
    }
    if (dailyResult.data) {
      setDaily(dailyResult.data);
    }
    setStatus({ kind: 'success', message: 'Analytics refreshed!' });
  };

  const handleRangeChange = (newRange: 7 | 30) => {
    if (newRange !== rangeDays) {
      setRangeDays(newRange);
    }
  };

  // Calculate chart dimensions and scaling
  const chartHeight = 120;
  const chartWidth = 100; // percentage
  const maxValue = Math.max(
    1,
    ...daily.map(d => d.done + d.snooze + d.dismiss)
  );

  const hasData = summary && (summary.sends > 0 || (summary.actions.done + summary.actions.snooze + summary.actions.dismiss) > 0);

  return (
    <section className="account-panel__card" aria-labelledby="reminder-analytics">
      <p className="account-panel__eyebrow">Analytics</p>
      <h3 id="reminder-analytics">Reminder Analytics</h3>
      <p className="account-panel__hint">
        Track reminder effectiveness: sends, actions (done/snooze/dismiss), and opt-in rates.
      </p>

      <button
        type="button"
        className="notification-preferences__action notification-preferences__action--secondary"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Hide Analytics' : 'Show Analytics'}
      </button>

      {isExpanded && (
        <div className="notification-preferences__card reminder-analytics__panel">
          {isDemoExperience && (
            <p className="notification-preferences__message notification-preferences__message--info">
              Demo mode - analytics data is simulated. Connect Supabase to see real data.
            </p>
          )}

          {status && (
            <p
              className={`notification-preferences__message notification-preferences__message--${status.kind}`}
              role={status.kind === 'error' ? 'alert' : 'status'}
            >
              {status.message}
            </p>
          )}

          <div className="reminder-analytics__header">
            <div className="reminder-analytics__range-selector">
              <button
                type="button"
                className={`reminder-analytics__range-btn ${rangeDays === 7 ? 'reminder-analytics__range-btn--active' : ''}`}
                onClick={() => handleRangeChange(7)}
                disabled={loading}
              >
                7 days
              </button>
              <button
                type="button"
                className={`reminder-analytics__range-btn ${rangeDays === 30 ? 'reminder-analytics__range-btn--active' : ''}`}
                onClick={() => handleRangeChange(30)}
                disabled={loading}
              >
                30 days
              </button>
            </div>
            <button
              type="button"
              className="notification-preferences__action notification-preferences__action--small"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading && !summary ? (
            <p className="notification-preferences__loading">Loading analytics…</p>
          ) : !hasData ? (
            <div className="reminder-analytics__empty">
              <p className="notification-preferences__message notification-preferences__message--info">
                No reminder data found for the last {rangeDays} days. Data will appear here after you receive and interact with reminders.
              </p>
            </div>
          ) : (
            <>
              {/* KPI Grid */}
              <div className="reminder-analytics__kpis">
                <div className="reminder-analytics__kpi">
                  <span className="reminder-analytics__kpi-value">{summary?.sends ?? 0}</span>
                  <span className="reminder-analytics__kpi-label">Sends</span>
                </div>
                <div className="reminder-analytics__kpi">
                  <span className="reminder-analytics__kpi-value">
                    {(summary?.actions.done ?? 0) + (summary?.actions.snooze ?? 0) + (summary?.actions.dismiss ?? 0)}
                  </span>
                  <span className="reminder-analytics__kpi-label">Actions</span>
                </div>
                <div className="reminder-analytics__kpi">
                  <span className="reminder-analytics__kpi-value reminder-analytics__kpi-value--done">
                    {formatPercentage(summary?.doneRatePct ?? 0)}
                  </span>
                  <span className="reminder-analytics__kpi-label">Done %</span>
                </div>
                <div className="reminder-analytics__kpi">
                  <span className="reminder-analytics__kpi-value reminder-analytics__kpi-value--snooze">
                    {formatPercentage(
                      summary && (summary.actions.done + summary.actions.snooze + summary.actions.dismiss) > 0
                        ? (summary.actions.snooze / (summary.actions.done + summary.actions.snooze + summary.actions.dismiss)) * 100
                        : 0
                    )}
                  </span>
                  <span className="reminder-analytics__kpi-label">Snooze %</span>
                </div>
                <div className="reminder-analytics__kpi">
                  <span className="reminder-analytics__kpi-value reminder-analytics__kpi-value--dismiss">
                    {formatPercentage(
                      summary && (summary.actions.done + summary.actions.snooze + summary.actions.dismiss) > 0
                        ? (summary.actions.dismiss / (summary.actions.done + summary.actions.snooze + summary.actions.dismiss)) * 100
                        : 0
                    )}
                  </span>
                  <span className="reminder-analytics__kpi-label">Dismiss %</span>
                </div>
                <div className="reminder-analytics__kpi">
                  <span className="reminder-analytics__kpi-value">
                    {formatPercentage(summary?.habitsEnabledPct ?? 0)}
                  </span>
                  <span className="reminder-analytics__kpi-label">Enabled %</span>
                </div>
              </div>

              {/* Daily Chart */}
              {daily.length > 0 && (
                <div className="reminder-analytics__chart">
                  <h4 className="reminder-analytics__chart-title">Daily Actions</h4>
                  <div className="reminder-analytics__chart-container">
                    <svg
                      className="reminder-analytics__chart-svg"
                      viewBox={`0 0 ${daily.length * 24} ${chartHeight}`}
                      preserveAspectRatio="none"
                      aria-label={`Daily actions chart for last ${rangeDays} days`}
                    >
                      {daily.map((d, i) => {
                        const total = d.done + d.snooze + d.dismiss;
                        const barX = i * 24 + 2;
                        const barWidth = 20;
                        
                        // Stacked bar heights
                        const doneHeight = maxValue > 0 ? (d.done / maxValue) * (chartHeight - 20) : 0;
                        const snoozeHeight = maxValue > 0 ? (d.snooze / maxValue) * (chartHeight - 20) : 0;
                        const dismissHeight = maxValue > 0 ? (d.dismiss / maxValue) * (chartHeight - 20) : 0;
                        
                        const baseY = chartHeight - 20;
                        
                        return (
                          <g key={d.day}>
                            {/* Done bar (green) */}
                            {doneHeight > 0 && (
                              <rect
                                x={barX}
                                y={baseY - doneHeight}
                                width={barWidth}
                                height={doneHeight}
                                className="reminder-analytics__chart-bar--done"
                                rx="2"
                              >
                                <title>{`${formatChartDate(d.day)}: ${d.done} done`}</title>
                              </rect>
                            )}
                            {/* Snooze bar (yellow) */}
                            {snoozeHeight > 0 && (
                              <rect
                                x={barX}
                                y={baseY - doneHeight - snoozeHeight}
                                width={barWidth}
                                height={snoozeHeight}
                                className="reminder-analytics__chart-bar--snooze"
                                rx="2"
                              >
                                <title>{`${formatChartDate(d.day)}: ${d.snooze} snoozed`}</title>
                              </rect>
                            )}
                            {/* Dismiss bar (red) */}
                            {dismissHeight > 0 && (
                              <rect
                                x={barX}
                                y={baseY - doneHeight - snoozeHeight - dismissHeight}
                                width={barWidth}
                                height={dismissHeight}
                                className="reminder-analytics__chart-bar--dismiss"
                                rx="2"
                              >
                                <title>{`${formatChartDate(d.day)}: ${d.dismiss} dismissed`}</title>
                              </rect>
                            )}
                            {/* Empty state bar */}
                            {total === 0 && (
                              <rect
                                x={barX}
                                y={baseY - 4}
                                width={barWidth}
                                height={4}
                                className="reminder-analytics__chart-bar--empty"
                                rx="2"
                              >
                                <title>{`${formatChartDate(d.day)}: No actions`}</title>
                              </rect>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="reminder-analytics__chart-legend">
                    <span className="reminder-analytics__legend-item reminder-analytics__legend-item--done">
                      <span className="reminder-analytics__legend-color"></span>
                      Done
                    </span>
                    <span className="reminder-analytics__legend-item reminder-analytics__legend-item--snooze">
                      <span className="reminder-analytics__legend-color"></span>
                      Snooze
                    </span>
                    <span className="reminder-analytics__legend-item reminder-analytics__legend-item--dismiss">
                      <span className="reminder-analytics__legend-color"></span>
                      Dismiss
                    </span>
                  </div>
                </div>
              )}

              {/* Additional stats */}
              <div className="reminder-analytics__stats">
                <div className="reminder-analytics__stat">
                  <span className="reminder-analytics__stat-label">Habits with preferences:</span>
                  <span className="reminder-analytics__stat-value">{summary?.habitsWithPrefs ?? 0}</span>
                </div>
                <div className="reminder-analytics__stat">
                  <span className="reminder-analytics__stat-label">Action rate:</span>
                  <span className="reminder-analytics__stat-value">{formatPercentage(summary?.actionRatePct ?? 0)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
