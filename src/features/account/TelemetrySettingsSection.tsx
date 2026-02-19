import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchTelemetryPreference,
  buildGoalCoachTelemetrySnapshot,
  getGoalCoachTelemetryDailySeries,
  getGoalCoachTelemetrySummary,
  type GoalCoachTelemetryCohort,
  type GoalCoachTelemetryDailyPoint,
  type GoalCoachTelemetrySummary,
  upsertTelemetryPreference,
} from '../../services/telemetry';

type TelemetrySettingsSectionProps = {
  session: Session;
  isDemoExperience: boolean;
};

export function TelemetrySettingsSection({ session, isDemoExperience }: TelemetrySettingsSectionProps) {
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [goalCoachSummary, setGoalCoachSummary] = useState<GoalCoachTelemetrySummary | null>(null);
  const [dailySeries, setDailySeries] = useState<GoalCoachTelemetryDailyPoint[]>([]);
  const [lookbackDays, setLookbackDays] = useState<7 | 14 | 30>(30);
  const [cohort, setCohort] = useState<GoalCoachTelemetryCohort>('all');


  const loadGoalCoachSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - lookbackDays);
      const sinceISO = since.toISOString();
      const [summary, trend] = await Promise.all([
        getGoalCoachTelemetrySummary({
          userId: session.user.id,
          sinceISO,
          cohort,
        }),
        getGoalCoachTelemetryDailySeries({
          userId: session.user.id,
          sinceISO,
          cohort,
        }),
      ]);
      setGoalCoachSummary(summary);
      setDailySeries(trend);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'Unable to load goal coach telemetry summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, [cohort, lookbackDays, session.user.id]);

  useEffect(() => {
    let isActive = true;

    setLoading(true);
    fetchTelemetryPreference(session.user.id)
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) {
          console.error('Failed to load telemetry preference:', error);
          setErrorMessage('Unable to load telemetry preferences.');
          return;
        }
        setTelemetryEnabled(data?.telemetry_enabled ?? false);
        void loadGoalCoachSummary();
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [loadGoalCoachSummary, session.user.id]);

  const handleTelemetryToggle = async (enabled: boolean) => {
    const previous = telemetryEnabled;
    setTelemetryEnabled(enabled);
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await upsertTelemetryPreference(session.user.id, enabled);
      if (error) {
        throw error;
      }
      setSuccessMessage('Telemetry preferences saved.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setTelemetryEnabled(previous);
      const message = error instanceof Error ? error.message : 'Unable to save telemetry preferences.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="account-panel__card" aria-labelledby="account-telemetry">
      <p className="account-panel__eyebrow">Game of Life telemetry</p>
      <h3 id="account-telemetry">Adaptive telemetry</h3>
      <p className="account-panel__hint">
        Opt in to share a minimal set of events so Game of Life can tune difficulty recommendations without collecting
        sensitive content. We never store journal text or habit details—only high-level counts.
      </p>

      {isDemoExperience ? (
        <p className="account-panel__hint">Demo mode stores telemetry locally on this device.</p>
      ) : null}

      {errorMessage ? (
        <p className="notification-preferences__message notification-preferences__message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="notification-preferences__message notification-preferences__message--success" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="account-panel__toggle-row">
        <label className="account-panel__toggle-label">
          <input
            type="checkbox"
            checked={telemetryEnabled}
            onChange={(event) => handleTelemetryToggle(event.target.checked)}
            disabled={loading || saving}
            className="account-panel__toggle-input"
          />
          <span className="account-panel__toggle-text">Enable adaptive telemetry</span>
        </label>
      </div>


      <label className="account-panel__hint" style={{ display: 'block', marginTop: '0.75rem' }}>
        Report window
        <select
          value={lookbackDays}
          onChange={(event) => setLookbackDays(Number(event.target.value) as 7 | 14 | 30)}
          style={{ marginLeft: '0.5rem' }}
          disabled={summaryLoading}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </label>


      <label className="account-panel__hint" style={{ display: 'block', marginTop: '0.5rem' }}>
        Cohort
        <select
          value={cohort}
          onChange={(event) => setCohort(event.target.value as GoalCoachTelemetryCohort)}
          style={{ marginLeft: '0.5rem' }}
          disabled={summaryLoading}
        >
          <option value="all">All</option>
          <option value="new">New users</option>
          <option value="returning">Returning users</option>
        </select>
      </label>

      <div className="account-panel__actions-row" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => void loadGoalCoachSummary()}
          disabled={summaryLoading}
        >
          {summaryLoading ? 'Refreshing…' : 'Refresh Goal Coach report'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            if (!goalCoachSummary) return;
            const snapshot = buildGoalCoachTelemetrySnapshot({
              summary: goalCoachSummary,
              dailySeries,
              lookbackDays,
              cohort,
            });
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `goal-coach-telemetry-${lookbackDays}d-${cohort}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }}
          disabled={!goalCoachSummary || summaryLoading}
        >
          Export snapshot
        </button>
      </div>

      {summaryError ? (
        <p className="notification-preferences__message notification-preferences__message--error" role="alert">
          {summaryError}
        </p>
      ) : null}

      {goalCoachSummary ? (
        <div className="account-panel__details" style={{ marginTop: '0.75rem' }}>
          <div>
            <dt>Goal coach sends</dt>
            <dd>{goalCoachSummary.totalSent}</dd>
          </div>
          <div>
            <dt>Drafts received</dt>
            <dd>{goalCoachSummary.totalDraftReceived}</dd>
          </div>
          <div>
            <dt>Goals created</dt>
            <dd>{goalCoachSummary.totalGoalCreated}</dd>
          </div>
          <div>
            <dt>Conversion (create/sent)</dt>
            <dd>{(goalCoachSummary.conversionRate * 100).toFixed(1)}%</dd>
          </div>
          {Object.entries(goalCoachSummary.byContextProfile).map(([profile, stats]) => (
            <div key={profile}>
              <dt>{profile} conversion</dt>
              <dd>
                {(stats.conversionRate * 100).toFixed(1)}% ({stats.goalCreated}/{stats.sent})
              </dd>
            </div>
          ))}
        </div>
      ) : null}


      {dailySeries.length > 0 ? (
        <div className="account-panel__details" style={{ marginTop: '0.75rem' }}>
          <div>
            <dt>Daily trend ({lookbackDays}d window)</dt>
            <dd>{dailySeries.length} day(s) with chat activity</dd>
          </div>
          {dailySeries.slice(-7).map((point) => (
            <div key={point.day}>
              <dt>{point.day}</dt>
              <dd>
                sent {point.sent} · drafts {point.draftReceived} · goals {point.goalCreated} · conv {(point.conversionRate * 100).toFixed(0)}%
              </dd>
            </div>
          ))}
        </div>
      ) : null}

      <ul className="account-panel__hint" style={{ marginTop: '0.75rem' }}>
        <li>Onboarding completion</li>
        <li>Balance shifts across the four axes</li>
        <li>Coach intervention acceptances</li>
        <li>Game of Life micro-quest completions</li>
      </ul>
    </section>
  );
}
