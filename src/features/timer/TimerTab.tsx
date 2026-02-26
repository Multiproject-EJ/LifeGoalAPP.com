import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { awardZenTokens } from '../../services/zenGarden';
import {
  DEFAULT_TIMER_SESSION,
  deriveRunningRemainingSeconds,
  recordTimerTelemetryEvent,
  readTimerSourceAnalytics,
  recordTimerSourceAnalytics,
  readTimerSession,
  type TimerSourceAnalytics,
  type TimerLaunchContext,
  type TimerSessionState,
  type TimerSourceType,
  writeTimerSession,
} from './timerSession';
import timerIcon from '../../assets/Timer.webp';
import './TimerTab.css';
import { SessionPlanner } from './SessionPlanner';
import { triggerCompletionHaptic } from '../../utils/completionHaptics';

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

type CompletionProfile = 'silent' | 'gentle-bell' | 'focus-chime' | 'vibrate';
type TimerThemeVariant = 'sleek-minimal' | 'high-contrast' | 'calm';

type SavedTimerPreset = {
  id: string;
  minutes: number;
};

type TimerPreferences = {
  completionProfile: CompletionProfile;
  themeVariant: TimerThemeVariant;
  defaultSourceType: TimerSourceType;
  savedPresets: SavedTimerPreset[];
};

const TIMER_PRESETS_MINUTES = [5, 10, 15, 25, 45, 60];
const ENABLE_TIMER_DIAL = true;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;
const ZEN_REWARD_BY_MINUTES = 1;
const TIMER_PREFERENCES_KEY = 'lifegoal_timer_preferences_v1';
const DEFAULT_TIMER_PREFERENCES: TimerPreferences = {
  completionProfile: 'gentle-bell',
  themeVariant: 'sleek-minimal',
  defaultSourceType: 'general',
  savedPresets: [],
};
const MAX_SAVED_PRESETS = 4;

const COMPLETION_PROFILE_OPTIONS: Array<{
  value: CompletionProfile;
  label: string;
  description: string;
}> = [
  { value: 'gentle-bell', label: 'Gentle bell', description: 'Soft single bell when timer finishes.' },
  { value: 'focus-chime', label: 'Focus chime', description: 'Clear two-tone completion chime.' },
  { value: 'vibrate', label: 'Vibration', description: 'Haptic pulse on supported devices.' },
  { value: 'silent', label: 'Silent', description: 'No sound or vibration.' },
];

const THEME_VARIANT_OPTIONS: Array<{ value: TimerThemeVariant; label: string; description: string }> = [
  { value: 'sleek-minimal', label: 'Sleek minimal', description: 'Clean default with subtle contrast.' },
  { value: 'high-contrast', label: 'High contrast', description: 'Sharper separation and stronger emphasis.' },
  { value: 'calm', label: 'Calm', description: 'Softer palette and gentler visual tone.' },
];

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

function formatDurationLabel(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function readTimerPreferences(): TimerPreferences {
  if (typeof window === 'undefined') return DEFAULT_TIMER_PREFERENCES;
  const raw = window.localStorage.getItem(TIMER_PREFERENCES_KEY);
  if (!raw) return DEFAULT_TIMER_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Partial<TimerPreferences>;
    const profile = parsed.completionProfile;
    const themeVariant = parsed.themeVariant;
    const defaultSourceType = parsed.defaultSourceType;
    const savedPresets = Array.isArray(parsed.savedPresets)
      ? parsed.savedPresets
          .filter((preset): preset is SavedTimerPreset =>
            Boolean(
              preset &&
                typeof preset.id === 'string' &&
                Number.isFinite(preset.minutes) &&
                preset.minutes >= MIN_DURATION_MINUTES &&
                preset.minutes <= MAX_DURATION_MINUTES,
            ),
          )
          .slice(0, MAX_SAVED_PRESETS)
      : [];
    if (profile && COMPLETION_PROFILE_OPTIONS.some((option) => option.value === profile)) {
      return {
        completionProfile: profile,
        themeVariant:
          themeVariant && THEME_VARIANT_OPTIONS.some((option) => option.value === themeVariant)
            ? themeVariant
            : DEFAULT_TIMER_PREFERENCES.themeVariant,
        defaultSourceType:
          defaultSourceType && SOURCE_OPTIONS.some((option) => option.value === defaultSourceType)
            ? defaultSourceType
            : DEFAULT_TIMER_PREFERENCES.defaultSourceType,
        savedPresets,
      };
    }

    return {
      ...DEFAULT_TIMER_PREFERENCES,
      themeVariant:
        themeVariant && THEME_VARIANT_OPTIONS.some((option) => option.value === themeVariant)
          ? themeVariant
          : DEFAULT_TIMER_PREFERENCES.themeVariant,
      defaultSourceType:
        defaultSourceType && SOURCE_OPTIONS.some((option) => option.value === defaultSourceType)
          ? defaultSourceType
          : DEFAULT_TIMER_PREFERENCES.defaultSourceType,
      savedPresets,
    };
  } catch {
    return DEFAULT_TIMER_PREFERENCES;
  }

  return DEFAULT_TIMER_PREFERENCES;
}

function writeTimerPreferences(preferences: TimerPreferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TIMER_PREFERENCES_KEY, JSON.stringify(preferences));
}

async function playCompletionTone(profile: CompletionProfile): Promise<void> {
  if (typeof window === 'undefined' || profile === 'silent' || profile === 'vibrate') {
    return;
  }

  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const audioContext = new AudioContextCtor();

  const playBeep = (frequency: number, durationMs: number, gainValue: number, startAt = 0) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startAt);
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime + startAt);
    gainNode.gain.exponentialRampToValueAtTime(gainValue, audioContext.currentTime + startAt + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + startAt + durationMs / 1000);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + startAt);
    oscillator.stop(audioContext.currentTime + startAt + durationMs / 1000 + 0.05);
  };

  if (profile === 'gentle-bell') {
    playBeep(784, 420, 0.07);
  }

  if (profile === 'focus-chime') {
    playBeep(659, 240, 0.08);
    playBeep(988, 280, 0.07, 0.22);
  }

  await new Promise((resolve) => window.setTimeout(resolve, 650));
  await audioContext.close();
}

export function TimerTab({ onNavigateToActions, userId, launchContext, onLaunchContextHandled }: TimerTabProps) {
  const [session, setSession] = useState<TimerSessionState>(() => readTimerSession());
  const [preferences, setPreferences] = useState<TimerPreferences>(() => readTimerPreferences());
  const [sourceAnalytics, setSourceAnalytics] = useState<TimerSourceAnalytics[]>(() => readTimerSourceAnalytics());
  const [customMinutesInput, setCustomMinutesInput] = useState('25');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<'quick' | 'session-plan'>('quick');
  const recordedCompletionRef = useRef<number | null>(null);

  const selectedSource = useMemo(
    () => SOURCE_OPTIONS.find((option) => option.value === session.sourceType) ?? SOURCE_OPTIONS[0],
    [session.sourceType]
  );

  useEffect(() => {
    writeTimerSession(session);
  }, [session]);

  useEffect(() => {
    writeTimerPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    setSession((current) => {
      if (current.status !== 'idle' || current.sourceType === preferences.defaultSourceType) {
        return current;
      }

      return {
        ...current,
        sourceType: preferences.defaultSourceType,
        sourceId: null,
      };
    });
  }, [preferences.defaultSourceType]);

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

    recordTimerTelemetryEvent({
      type: 'launch_context_applied',
      sourceType: launchContext.sourceType,
      durationSeconds: session.durationSeconds,
      metadata: {
        hasSourceId: Boolean(launchContext.sourceId),
        hasSourceName: Boolean(launchContext.sourceName),
      },
    });

    onLaunchContextHandled?.();
  }, [launchContext, onLaunchContextHandled, session.durationSeconds]);

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

  useEffect(() => {
    if (session.status !== 'completed') {
      return;
    }

    if (preferences.completionProfile === 'vibrate') {
      triggerCompletionHaptic('medium', { channel: 'timer', minIntervalMs: 2500 });
      return;
    }

    void playCompletionTone(preferences.completionProfile);
  }, [preferences.completionProfile, session.status]);

  useEffect(() => {
    if (session.status !== 'completed' || !session.completedAt) {
      return;
    }

    if (recordedCompletionRef.current === session.completedAt) {
      return;
    }

    const nextAnalytics = recordTimerSourceAnalytics(session.sourceType, session.durationSeconds);
    setSourceAnalytics(nextAnalytics);
    recordTimerTelemetryEvent({
      type: 'timer_completed',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
      metadata: {
        rewarded: session.rewarded,
      },
    });
    recordedCompletionRef.current = session.completedAt;
  }, [session.completedAt, session.durationSeconds, session.rewarded, session.sourceType, session.status]);

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

  const handleSaveCurrentPreset = useCallback(() => {
    const currentMinutes = Math.round(session.durationSeconds / 60);
    if (currentMinutes < MIN_DURATION_MINUTES || currentMinutes > MAX_DURATION_MINUTES) {
      return;
    }

    setPreferences((current) => {
      const existing = current.savedPresets.find((preset) => preset.minutes === currentMinutes);
      if (existing) {
        return current;
      }

      const nextPreset: SavedTimerPreset = {
        id: `preset-${Date.now()}`,
        minutes: currentMinutes,
      };
      return {
        ...current,
        savedPresets: [nextPreset, ...current.savedPresets].slice(0, MAX_SAVED_PRESETS),
      };
    });
    setStatusMessage(`Saved ${currentMinutes}m as a personal preset.`);
    recordTimerTelemetryEvent({
      type: 'preset_saved',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
      metadata: { minutes: currentMinutes },
    });
  }, [session.durationSeconds]);

  const handleRemoveSavedPreset = useCallback((presetId: string) => {
    setPreferences((current) => ({
      ...current,
      savedPresets: current.savedPresets.filter((preset) => preset.id !== presetId),
    }));
    recordTimerTelemetryEvent({
      type: 'preset_removed',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
      metadata: { presetId },
    });
  }, [session.durationSeconds, session.sourceType]);

  const handleStart = useCallback(() => {
    setStatusMessage(null);
    recordTimerTelemetryEvent({
      type: 'timer_started',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
    });
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
  }, [session.durationSeconds, session.sourceType]);

  const handlePause = useCallback(() => {
    recordTimerTelemetryEvent({
      type: 'timer_paused',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
    });
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
  }, [session.durationSeconds, session.sourceType]);

  const handleResume = useCallback(() => {
    recordTimerTelemetryEvent({
      type: 'timer_resumed',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
    });
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
  }, [session.durationSeconds, session.sourceType]);

  const handleReset = useCallback(() => {
    setStatusMessage(null);
    recordTimerTelemetryEvent({
      type: 'timer_reset',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
    });
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
  }, [session.durationSeconds, session.sourceType]);

  const handleAcknowledgeDone = useCallback(() => {
    recordTimerTelemetryEvent({
      type: 'timer_acknowledged',
      sourceType: session.sourceType,
      durationSeconds: session.durationSeconds,
    });
    setSession((current) => ({
      ...current,
      status: 'idle',
      remainingSeconds: current.durationSeconds,
      startedAt: null,
      pausedAt: null,
      endsAt: null,
      completedAt: null,
    }));
  }, [session.durationSeconds, session.sourceType]);

  const progress = useMemo(() => {
    if (session.durationSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, ((session.durationSeconds - session.remainingSeconds) / session.durationSeconds) * 100));
  }, [session.durationSeconds, session.remainingSeconds]);

  const sortedSourceAnalytics = useMemo(
    () => [...sourceAnalytics].sort((a, b) => b.totalSeconds - a.totalSeconds),
    [sourceAnalytics],
  );

  const refreshSourceAnalytics = useCallback(() => {
    setSourceAnalytics(readTimerSourceAnalytics());
  }, []);

  const sourceLabelByType = useMemo(
    () => new Map(SOURCE_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );

  return (
    <div className={`timer-tab timer-tab--theme-${preferences.themeVariant}`}>
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

      <section className="timer-tab__mode-toggle" aria-label="Timer mode">
        <button
          type="button"
          className={`timer-tab__chip ${timerMode === 'quick' ? 'timer-tab__chip--active' : ''}`}
          onClick={() => setTimerMode('quick')}
        >
          Quick timer
        </button>
        <button
          type="button"
          className={`timer-tab__chip ${timerMode === 'session-plan' ? 'timer-tab__chip--active' : ''}`}
          onClick={() => setTimerMode('session-plan')}
        >
          Session plan
        </button>
      </section>

      {timerMode === 'quick' ? (
      <><section className="timer-tab__main-card" aria-label="Timer session">
        <img src={timerIcon} alt="" className="timer-tab__hero-image" aria-hidden="true" />
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
        <div className="timer-tab__duration-adjust">
          <button
            type="button"
            className="timer-tab__btn"
            onClick={() => applyDurationMinutes(Math.round(session.durationSeconds / 60) - 1)}
            aria-label="Decrease quick timer by one minute"
          >
            −1m
          </button>
          <input
            type="range"
            min={MIN_DURATION_MINUTES}
            max={MAX_DURATION_MINUTES}
            step={1}
            value={Math.round(session.durationSeconds / 60)}
            onChange={(event) => applyDurationMinutes(Number(event.target.value))}
            className="timer-tab__range"
            aria-label="Quick timer minutes slider"
          />
          <button
            type="button"
            className="timer-tab__btn"
            onClick={() => applyDurationMinutes(Math.round(session.durationSeconds / 60) + 1)}
            aria-label="Increase quick timer by one minute"
          >
            +1m
          </button>
        </div>
        <small className="timer-tab__hint">{Math.round(session.durationSeconds / 60)} minutes selected</small>
        {ENABLE_TIMER_DIAL && (
          <label className="timer-tab__field">
            Dial duration
            <div className="timer-tab__dial-wrap">
              <input
                type="range"
                min={MIN_DURATION_MINUTES}
                max={MAX_DURATION_MINUTES}
                step={1}
                value={Math.round(session.durationSeconds / 60)}
                onChange={(event) => applyDurationMinutes(Number(event.target.value))}
                className="timer-tab__dial"
                aria-label="Dial timer minutes"
              />
              <span className="timer-tab__dial-value">{Math.round(session.durationSeconds / 60)}m</span>
            </div>
          </label>
        )}
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

        <div className="timer-tab__field">
          <div className="timer-tab__field-row timer-tab__field-row--wrap">
            <button
              type="button"
              className="timer-tab__btn"
              onClick={handleSaveCurrentPreset}
              aria-label="Save current timer duration as preset"
            >
              ⭐ Save current preset
            </button>
          </div>
          {preferences.savedPresets.length > 0 ? (
            <div className="timer-tab__saved-presets" aria-label="Saved timer presets">
              {preferences.savedPresets.map((preset) => (
                <div key={preset.id} className="timer-tab__saved-preset-item">
                  <button
                    type="button"
                    className="timer-tab__chip"
                    onClick={() => applyDurationMinutes(preset.minutes)}
                    aria-label={`Apply saved preset ${preset.minutes} minutes`}
                  >
                    {preset.minutes}m
                  </button>
                  <button
                    type="button"
                    className="timer-tab__saved-preset-remove"
                    onClick={() => handleRemoveSavedPreset(preset.id)}
                    aria-label={`Remove saved preset ${preset.minutes} minutes`}
                    title="Remove preset"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <small className="timer-tab__hint">Save up to 4 personal presets for one-tap launch.</small>
          )}
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

        <label className="timer-tab__field">
          Default focus source
          <select
            className="timer-tab__input"
            value={preferences.defaultSourceType}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                defaultSourceType: event.target.value as TimerSourceType,
              }))
            }
            aria-label="Choose default timer source"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="timer-tab__field">
          Theme variant
          <select
            className="timer-tab__input"
            value={preferences.themeVariant}
            onChange={(event) =>
              {
                const nextTheme = event.target.value as TimerThemeVariant;
                setPreferences((current) => ({
                  ...current,
                  themeVariant: nextTheme,
                }));
                recordTimerTelemetryEvent({
                  type: 'theme_changed',
                  sourceType: session.sourceType,
                  durationSeconds: session.durationSeconds,
                  metadata: { theme: nextTheme },
                });
              }
            }
            aria-label="Choose timer theme variant"
          >
            {THEME_VARIANT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
        </label>

        <label className="timer-tab__field">
          Completion alert
          <select
            className="timer-tab__input"
            value={preferences.completionProfile}
            onChange={(event) =>
              {
                const nextProfile = event.target.value as CompletionProfile;
                setPreferences((current) => ({
                  ...current,
                  completionProfile: nextProfile,
                }));
                recordTimerTelemetryEvent({
                  type: 'completion_profile_changed',
                  sourceType: session.sourceType,
                  durationSeconds: session.durationSeconds,
                  metadata: { profile: nextProfile },
                });
              }
            }
            aria-label="Choose timer completion alert profile"
          >
            {COMPLETION_PROFILE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
        </label>

        {session.sourceType === 'meditation' && (
          <p className="timer-tab__lotus-note">🪷 Meditation timers award lotus currency on completion.</p>
        )}

        <div className="timer-tab__field" aria-label="Timer source analytics">
          <h3>Focus time by source</h3>
          {sortedSourceAnalytics.length > 0 ? (
            <div className="timer-tab__analytics-list">
              {sortedSourceAnalytics.map((item) => (
                <div key={item.sourceType} className="timer-tab__analytics-item">
                  <span className="timer-tab__analytics-source">
                    {sourceLabelByType.get(item.sourceType) ?? item.sourceType}
                  </span>
                  <span className="timer-tab__analytics-value">
                    {formatDurationLabel(item.totalSeconds)} • {item.completedSessions} session
                    {item.completedSessions === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <small className="timer-tab__hint">Complete a timer to start source analytics.</small>
          )}
        </div>
      </section></>
      ) : (
        <SessionPlanner
          sourceLabel={selectedSource.label}
          sourceType={session.sourceType}
          onSourceAnalyticsUpdated={refreshSourceAnalytics}
        />
      )}
    </div>
  );
}
