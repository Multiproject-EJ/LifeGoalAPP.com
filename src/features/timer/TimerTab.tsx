import { useCallback, useEffect, useMemo, useState } from 'react';
import { awardZenTokens } from '../../services/zenGarden';
import {
  DEFAULT_TIMER_SESSION,
  deriveRunningRemainingSeconds,
  readTimerSession,
  type TimerLaunchContext,
  type TimerSessionState,
  type TimerSourceType,
  writeTimerSession,
} from './timerSession';
import './TimerTab.css';

type TimerTabProps = {
  onNavigateToActions?: () => void;
  userId?: string | null;
  launchContext?: TimerLaunchContext | null;
  onLaunchContextHandled?: () => void;
};

type SourceOption = {
  value: TimerSourceType;
  label: string;
  icon: string;
  description: string;
};

const TIMER_PRESETS_MINUTES = [5, 10, 15, 25, 45, 60];
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;
const ZEN_REWARD_BY_MINUTES = 1;

const SOURCE_OPTIONS: SourceOption[] = [
  { value: 'general', label: 'General focus', icon: '⏱️', description: 'Ad-hoc deep work sprint' },
  { value: 'habit', label: 'Habit', icon: '🔄', description: 'Attach to a habit session' },
  { value: 'goal', label: 'Goal', icon: '🎯', description: 'Work against a life goal' },
  { value: 'journal', label: 'Journal', icon: '📔', description: 'Reflection writing block' },
  { value: 'meditation', label: 'Meditation', icon: '🪷', description: 'Breath, calm, and mindfulness' },
  { value: 'project', label: 'Project', icon: '📋', description: 'Project task focus block' },
  { value: 'vision', label: 'Vision board', icon: '🖼️', description: 'Visualization or vision task' },
];

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function TimerTab({ onNavigateToActions, userId, launchContext, onLaunchContextHandled }: TimerTabProps) {
  const [session, setSession] = useState<TimerSessionState>(() => readTimerSession());
  const [customMinutesInput, setCustomMinutesInput] = useState('25');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedSource = useMemo(
    () => SOURCE_OPTIONS.find((option) => option.value === session.sourceType) ?? SOURCE_OPTIONS[0],
    [session.sourceType]
  );

  useEffect(() => {
    writeTimerSession(session);
  }, [session]);

  useEffect(() => {
    if (session.status !== 'running') return;

    const interval = window.setInterval(() => {
      setSession((current) => {
        if (current.status !== 'running') return current;

        const remaining = deriveRunningRemainingSeconds(current);
        if (remaining <= 0) {
          return {
            ...current,
            status: 'completed',
            remainingSeconds: 0,
            completedAt: Date.now(),
            pausedAt: null,
            endsAt: null,
          };
        }

        return {
          ...current,
          remainingSeconds: remaining,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session.status]);

  useEffect(() => {
    if (!launchContext) return;

    setSession((current) => ({
      ...current,
      sourceType: launchContext.sourceType,
      sourceId: launchContext.sourceId ?? null,
      sourceName: launchContext.sourceName ?? current.sourceName,
    }));

    if (launchContext.sourceName) {
      setStatusMessage(`Timer ready for: ${launchContext.sourceName}`);
    }

    onLaunchContextHandled?.();
  }, [launchContext, onLaunchContextHandled]);

  useEffect(() => {
    if (session.status !== 'completed' || session.rewarded || session.sourceType !== 'meditation' || !userId) {
      return;
    }

    const rewardAmount = Math.max(1, Math.floor(session.durationSeconds / 60 / ZEN_REWARD_BY_MINUTES));

    void awardZenTokens(
      userId,
      rewardAmount,
      'timer_meditation_session',
      session.sourceId ?? undefined,
      `Meditation timer completed (${Math.round(session.durationSeconds / 60)} min)`
    ).then(({ error }) => {
      if (error) {
        setStatusMessage('Timer completed. Could not award lotus tokens right now.');
        return;
      }

      setSession((current) => ({ ...current, rewarded: true }));
      setStatusMessage(`Timer completed. You earned ${rewardAmount} 🪷 lotus tokens.`);
    });
  }, [session.status, session.rewarded, session.sourceType, session.durationSeconds, session.sourceId, userId]);

  const applyDurationMinutes = useCallback((minutes: number) => {
    const safeMinutes = Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(minutes)));
    const nextDurationSeconds = safeMinutes * 60;

    setSession((current) => ({
      ...current,
      durationSeconds: nextDurationSeconds,
      remainingSeconds: nextDurationSeconds,
      status: current.status === 'running' ? current.status : 'idle',
      startedAt: current.status === 'running' ? current.startedAt : null,
      pausedAt: null,
      completedAt: null,
      rewarded: false,
    }));
    setCustomMinutesInput(String(safeMinutes));
  }, []);

  const handleStart = useCallback(() => {
    setStatusMessage(null);
    setSession((current) => {
      const duration = current.remainingSeconds > 0 ? current.remainingSeconds : current.durationSeconds;
      const now = Date.now();
      return {
        ...current,
        status: 'running',
        startedAt: now,
        endsAt: now + duration * 1000,
        pausedAt: null,
        completedAt: null,
        rewarded: false,
      };
    });
  }, []);

  const handlePause = useCallback(() => {
    setSession((current) => {
      if (current.status !== 'running') return current;
      return {
        ...current,
        status: 'paused',
        remainingSeconds: deriveRunningRemainingSeconds(current),
        pausedAt: Date.now(),
        endsAt: null,
      };
    });
  }, []);

  const handleResume = useCallback(() => {
    setSession((current) => {
      if (current.status !== 'paused') return current;
      const now = Date.now();
      return {
        ...current,
        status: 'running',
        startedAt: current.startedAt ?? now,
        pausedAt: null,
        endsAt: now + current.remainingSeconds * 1000,
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setStatusMessage(null);
    setSession((current) => ({
      ...current,
      status: 'idle',
      remainingSeconds: current.durationSeconds,
      startedAt: null,
      pausedAt: null,
      endsAt: null,
      completedAt: null,
      rewarded: false,
    }));
  }, []);

  const handleAcknowledgeDone = useCallback(() => {
    setSession((current) => ({
      ...current,
      status: 'idle',
      remainingSeconds: current.durationSeconds,
      startedAt: null,
      pausedAt: null,
      endsAt: null,
      completedAt: null,
    }));
  }, []);

  const progress = useMemo(() => {
    if (session.durationSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, ((session.durationSeconds - session.remainingSeconds) / session.durationSeconds) * 100));
  }, [session.durationSeconds, session.remainingSeconds]);

  return (
    <div className="timer-tab">
      <header className="timer-tab__header">
        <div className="timer-tab__header-content">
          <h2 className="timer-tab__title">Timer</h2>
          <p className="timer-tab__subtitle">Minimal focus timer, integrated across habits, goals, projects, journal, meditation, and vision work.</p>
        </div>
        <div className="timer-tab__header-actions">
          {onNavigateToActions && (
            <button
              className="timer-tab__header-icon"
              onClick={onNavigateToActions}
              type="button"
              aria-label="Back to Actions"
              title="Back to Actions"
            >
              ⚡️
            </button>
          )}
        </div>
      </header>

      <section className="timer-tab__main-card" aria-label="Timer session">
        <div className="timer-tab__clock">{formatClock(session.remainingSeconds)}</div>
        <div className="timer-tab__progress-track" aria-hidden="true">
          <div className="timer-tab__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="timer-tab__meta">
          {selectedSource.icon} {selectedSource.label}
          {session.sourceName ? ` • ${session.sourceName}` : ''}
          {' • '}
          {Math.round(session.durationSeconds / 60)} min
        </p>

        <div className="timer-tab__controls">
          {session.status === 'idle' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={handleStart}>Start</button>}
          {session.status === 'running' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={handlePause}>Pause</button>}
          {session.status === 'paused' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={handleResume}>Resume</button>}
          {session.status === 'completed' && <button type="button" className="timer-tab__btn timer-tab__btn--primary" onClick={handleAcknowledgeDone}>Done</button>}

          {(session.status === 'running' || session.status === 'paused') && (
            <button type="button" className="timer-tab__btn" onClick={handleReset}>Reset</button>
          )}
        </div>
        {statusMessage && <p className="timer-tab__status">{statusMessage}</p>}
      </section>

      <section className="timer-tab__setup" aria-label="Timer setup">
        <h3>Quick duration</h3>
        <div className="timer-tab__preset-grid">
          {TIMER_PRESETS_MINUTES.map((minutes) => (
            <button
              type="button"
              key={minutes}
              className={`timer-tab__chip ${session.durationSeconds === minutes * 60 ? 'timer-tab__chip--active' : ''}`}
              onClick={() => applyDurationMinutes(minutes)}
            >
              {minutes}m
            </button>
          ))}
        </div>

        <label className="timer-tab__field">
          Custom minutes
          <div className="timer-tab__field-row">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={customMinutesInput}
              onChange={(event) => setCustomMinutesInput(event.target.value.replace(/[^0-9]/g, ''))}
              className="timer-tab__input"
              aria-label="Custom timer minutes"
            />
            <button
              type="button"
              className="timer-tab__btn"
              onClick={() => {
                const parsed = Number(customMinutesInput);
                if (!Number.isFinite(parsed)) return;
                applyDurationMinutes(parsed);
              }}
            >
              Apply
            </button>
          </div>
        </label>

        <h3>What are you focusing on?</h3>
        <div className="timer-tab__source-grid">
          {SOURCE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`timer-tab__source-card ${session.sourceType === option.value ? 'timer-tab__source-card--active' : ''}`}
              onClick={() => setSession((current) => ({ ...current, sourceType: option.value }))}
            >
              <span className="timer-tab__source-icon">{option.icon}</span>
              <span className="timer-tab__source-title">{option.label}</span>
              <span className="timer-tab__source-description">{option.description}</span>
            </button>
          ))}
        </div>

        <label className="timer-tab__field">
          Optional context name (habit, goal, project, journal prompt...)
          <input
            value={session.sourceName ?? ''}
            onChange={(event) =>
              setSession((current) => ({
                ...current,
                sourceName: event.target.value,
              }))
            }
            className="timer-tab__input"
            placeholder="e.g. Deep Work: Q2 roadmap"
          />
        </label>

        {session.sourceType === 'meditation' && (
          <p className="timer-tab__lotus-note">🪷 Meditation timers award lotus currency on completion.</p>
        )}
      </section>
    </div>
  );
}
