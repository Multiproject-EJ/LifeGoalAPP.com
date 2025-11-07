import { ChangeEvent, FormEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchGoals } from '../../services/goals';
import {
  deleteGoalReflection,
  fetchGoalReflections,
  insertGoalReflection,
  type GoalReflectionRow,
} from '../../services/goalReflections';
import {
  generateFollowUpPrompts,
  type FollowUpPrompt,
} from '../../services/reflectionPrompts';
import type { Database } from '../../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];

type GoalReflectionJournalProps = {
  session: Session;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

type ConfidenceOption = { value: number; label: string; description: string };

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  { value: 5, label: 'Energized', description: 'Progress is flowing and support is locked in.' },
  { value: 4, label: 'Optimistic', description: 'Momentum is strong with a few items to watch.' },
  { value: 3, label: 'Steady', description: 'Holding steady with balanced wins and challenges.' },
  { value: 2, label: 'Wobbly', description: 'Momentum is slipping—focus on unblocking the next step.' },
  { value: 1, label: 'Stalled', description: 'Goal needs attention and a fresh plan to move forward.' },
];

const confidenceMeta = CONFIDENCE_OPTIONS.reduce<Record<number, ConfidenceOption>>((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  year: 'numeric',
});

type ConfidenceTrendPoint = {
  label: string;
  monthKey: string;
  monthStart: Date;
  average: number;
  entryCount: number;
};

type ConfidenceTrend = {
  points: ConfidenceTrendPoint[];
  summary: string;
};

type TrendChartPoint = {
  cx: number;
  cy: number;
  label: string;
  average: number;
};

type TrendChartGeometry = {
  width: number;
  height: number;
  path: string;
  areaPath: string;
  points: TrendChartPoint[];
  baselineY: number;
  yTicks: { value: number; y: number }[];
};

const TREND_CHART_WIDTH = 640;
const TREND_CHART_HEIGHT = 260;
const TREND_CHART_PADDING = 48;

function formatDateLabel(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatConfidence(value: number | null): string {
  if (!value || !confidenceMeta[value]) {
    return 'Not recorded';
  }
  const option = confidenceMeta[value];
  return `${value}/5 · ${option.label}`;
}

function normalizeConfidence(value: number | null): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const clamped = Math.min(5, Math.max(1, value));
  return Math.round(clamped * 10) / 10;
}

function buildConfidenceTrend(reflections: GoalReflectionRow[]): ConfidenceTrend | null {
  const groups = new Map<string, { monthStart: Date; confidences: number[] }>();

  for (const reflection of reflections) {
    if (!reflection.entry_date) continue;
    const entryDate = new Date(reflection.entry_date);
    if (Number.isNaN(entryDate.getTime())) continue;
    const monthStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
    const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
    const confidence = normalizeConfidence(reflection.confidence ?? null);
    if (confidence === null) continue;

    const existing = groups.get(monthKey);
    if (existing) {
      existing.confidences.push(confidence);
    } else {
      groups.set(monthKey, { monthStart, confidences: [confidence] });
    }
  }

  if (groups.size === 0) {
    return null;
  }

  const points: ConfidenceTrendPoint[] = Array.from(groups.entries())
    .map(([monthKey, group]) => {
      const total = group.confidences.reduce((sum, value) => sum + value, 0);
      const average = Number((total / group.confidences.length).toFixed(2));
      return {
        label: monthFormatter.format(group.monthStart),
        monthKey,
        monthStart: group.monthStart,
        average,
        entryCount: group.confidences.length,
      } satisfies ConfidenceTrendPoint;
    })
    .sort((a, b) => a.monthStart.getTime() - b.monthStart.getTime());

  const latest = points.length > 0 ? points[points.length - 1] : undefined;
  if (!latest) {
    return null;
  }

  const previous = points.length > 1 ? points[points.length - 2] : null;
  const summary = previous
    ? createTrendSummary(latest, previous)
    : `Confidence is averaging ${latest.average.toFixed(1)} this month. Add more reflections to build your trendline.`;

  return { points, summary } satisfies ConfidenceTrend;
}

function createTrendSummary(latest: ConfidenceTrendPoint, previous: ConfidenceTrendPoint): string {
  const delta = Number((latest.average - previous.average).toFixed(1));
  if (Math.abs(delta) < 0.05) {
    return `Confidence held steady at ${latest.average.toFixed(1)} from ${previous.label} to ${latest.label}.`;
  }

  const direction = delta > 0 ? 'climbed' : 'dipped';
  return `Confidence ${direction} ${formatSignedDelta(delta)} between ${previous.label} and ${latest.label}.`;
}

function formatSignedDelta(value: number, fractionDigits = 1): string {
  const rounded = Math.abs(value).toFixed(fractionDigits);
  return `${value > 0 ? '+' : '−'}${rounded}`;
}

function buildTrendChart(points: ConfidenceTrendPoint[]): TrendChartGeometry | null {
  if (points.length === 0) {
    return null;
  }

  const width = TREND_CHART_WIDTH;
  const height = TREND_CHART_HEIGHT;
  const padding = TREND_CHART_PADDING;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const baselineY = height - padding;

  const xPositions = points.map((_, index) => {
    if (points.length === 1) {
      return padding + innerWidth / 2;
    }
    return padding + (index / (points.length - 1)) * innerWidth;
  });

  const yPositions = points.map((point) => {
    const ratio = (point.average - 1) / 4;
    return baselineY - ratio * innerHeight;
  });

  const linePath = xPositions
    .map((x, index) => {
      const y = yPositions[index];
      const command = index === 0 ? 'M' : 'L';
      return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const startX = xPositions[0];
  const endX = xPositions[xPositions.length - 1];
  const areaPath = [`M${startX.toFixed(2)},${baselineY.toFixed(2)}`]
    .concat(
      xPositions.map((x, index) => `L${x.toFixed(2)},${yPositions[index].toFixed(2)}`),
      `L${endX.toFixed(2)},${baselineY.toFixed(2)}`,
      'Z',
    )
    .join(' ');

  const chartPoints: TrendChartPoint[] = points.map((point, index) => ({
    cx: Number(xPositions[index].toFixed(2)),
    cy: Number(yPositions[index].toFixed(2)),
    label: point.label,
    average: Number(point.average.toFixed(1)),
  }));

  const yTicks = [5, 4, 3, 2, 1].map((value) => {
    const ratio = (value - 1) / 4;
    const y = baselineY - ratio * innerHeight;
    return { value, y: Number(y.toFixed(2)) };
  });

  return {
    width,
    height,
    path: linePath,
    areaPath,
    points: chartPoints,
    baselineY,
    yTicks,
  } satisfies TrendChartGeometry;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GoalReflectionJournal({ session }: GoalReflectionJournalProps) {
  const { isConfigured, mode, isAuthenticated } = useSupabaseAuth();
  const isDemoExperience = mode === 'demo' || !isAuthenticated;
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [reflections, setReflections] = useState<GoalReflectionRow[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<FollowUpPrompt[]>([]);
  const [promptSource, setPromptSource] = useState<'supabase' | 'demo' | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState<string>(getTodayISO());
  const [confidence, setConfidence] = useState<number>(4);
  const [highlight, setHighlight] = useState('');
  const [challenge, setChallenge] = useState('');
  const trendTitleId = useId();

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  const confidenceTrend = useMemo(() => buildConfidenceTrend(reflections), [reflections]);
  const trendChart = useMemo(
    () => (confidenceTrend ? buildTrendChart(confidenceTrend.points) : null),
    [confidenceTrend],
  );

  const loadGoals = useCallback(async () => {
    if (!isConfigured) {
      setGoals([]);
      setSelectedGoalId('');
      return;
    }

    setLoadingGoals(true);
    setErrorMessage(null);
    try {
      const { data, error } = await fetchGoals();
      if (error) throw error;
      const ownedGoals = (data ?? []).filter((goal) => goal.user_id === session.user.id);
      setGoals(ownedGoals);

      if (ownedGoals.length === 0) {
        setSelectedGoalId('');
        setReflections([]);
        return;
      }

      setSelectedGoalId((current) => {
        if (current && ownedGoals.some((goal) => goal.id === current)) {
          return current;
        }
        return ownedGoals[0]?.id ?? '';
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load goals for reflections right now.',
      );
      setGoals([]);
      setSelectedGoalId('');
    } finally {
      setLoadingGoals(false);
    }
  }, [session, isConfigured, isDemoExperience]);

  const loadReflections = useCallback(
    async (goalId: string) => {
      if (!goalId) {
        setReflections([]);
        setPrompts([]);
        setPromptSource(null);
        setPromptError(null);
        return;
      }

      if (!isConfigured) {
        setReflections([]);
        setPrompts([]);
        setPromptSource(null);
        setPromptError(null);
        return;
      }

      setLoadingReflections(true);
      setErrorMessage(null);
      try {
        const { data, error } = await fetchGoalReflections(goalId);
        if (error) throw error;
        setReflections(data ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load your reflection history. Please try again shortly.',
        );
        setReflections([]);
        setPrompts([]);
        setPromptSource(null);
        setPromptError(null);
      } finally {
        setLoadingReflections(false);
      }
    },
    [session, isConfigured, isDemoExperience],
  );

  useEffect(() => {
    if (!isConfigured && !isDemoExperience) {
      setGoals([]);
      setReflections([]);
      setPrompts([]);
      setPromptSource(null);
      setPromptError(null);
      setSelectedGoalId('');
      return;
    }
    void loadGoals();
  }, [session?.user?.id, isConfigured, isDemoExperience, loadGoals]);

  useEffect(() => {
    if (!selectedGoalId) {
      setReflections([]);
      setPrompts([]);
      setPromptSource(null);
      setPromptError(null);
      return;
    }
    void loadReflections(selectedGoalId);
  }, [selectedGoalId, loadReflections]);

  useEffect(() => {
    setStatus(null);
  }, [selectedGoalId]);

  const handleGoalSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedGoalId(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured && !isDemoExperience) {
      setStatus({ kind: 'error', message: 'Connect Supabase to save reflections.' });
      return;
    }

    if (!selectedGoalId) {
      setStatus({ kind: 'error', message: 'Choose a goal before saving a reflection.' });
      return;
    }

    const trimmedHighlight = highlight.trim();
    const trimmedChallenge = challenge.trim();

    if (!trimmedHighlight) {
      setStatus({ kind: 'error', message: 'Capture at least one highlight from your latest progress.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const { data, error } = await insertGoalReflection({
        goal_id: selectedGoalId,
        user_id: session.user.id,
        entry_date: entryDate,
        confidence,
        highlight: trimmedHighlight,
        challenge: trimmedChallenge || null,
      });
      if (error) throw error;
      if (data) {
        setReflections((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      }
      setStatus({ kind: 'success', message: 'Reflection saved. Keep momentum insights flowing.' });
      setEntryDate(getTodayISO());
      setConfidence(4);
      setHighlight('');
      setChallenge('');
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to save this reflection. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reflection: GoalReflectionRow) => {
    if (!isConfigured && !isDemoExperience) {
      setStatus({ kind: 'error', message: 'Connect Supabase to manage saved reflections.' });
      return;
    }

    const confirmed = window.confirm('Remove this reflection? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingId(reflection.id);
    setStatus(null);
    try {
      const { error } = await deleteGoalReflection(reflection.id);
      if (error) throw error;
      setReflections((current) => current.filter((item) => item.id !== reflection.id));
      setStatus({ kind: 'success', message: 'Reflection removed.' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to delete the reflection right now.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!selectedGoalId || reflections.length === 0) {
      setPrompts([]);
      setPromptSource(null);
      setPromptError(null);
      setLoadingPrompts(false);
      return;
    }

    let cancelled = false;
    setLoadingPrompts(true);
    setPromptError(null);

    const goalTitle = selectedGoal?.title;

    void (async () => {
      try {
        const { data, source } = await generateFollowUpPrompts(
          selectedGoalId,
          goalTitle,
          reflections,
        );
        if (cancelled) return;
        setPrompts(data ?? []);
        setPromptSource(source);
      } catch (error) {
        if (cancelled) return;
        setPrompts([]);
        setPromptSource(null);
        setPromptError(
          error instanceof Error
            ? error.message
            : 'Unable to translate reflections into prompts right now.',
        );
      } finally {
        if (cancelled) return;
        setLoadingPrompts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGoalId, reflections, selectedGoal?.title]);

  const confidenceDescription = confidenceMeta[confidence]?.description ?? '';

  const canJournal = useMemo(() => goals.length > 0 && Boolean(selectedGoalId), [goals, selectedGoalId]);

  return (
    <section className="goal-reflection-journal card glass" data-draggable draggable="true">
      <header className="goal-reflection-journal__header">
        <div>
          <h2>Goal reflection journal</h2>
          <p>
            Log weekly insights for each goal, capture what worked, and note the challenges that need support.
            The confidence score keeps your focus tuned to momentum swings.
          </p>
        </div>
        {goals.length > 0 ? (
          <label className="goal-reflection-journal__goal-picker">
            <span>Viewing</span>
            <select value={selectedGoalId} onChange={handleGoalSelect} disabled={loadingGoals}>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {isDemoExperience ? (
        <p className="goal-reflection-journal__status goal-reflection-journal__status--info">
          Reflections are stored locally while you explore the demo workspace. Add Supabase credentials to sync
          journal entries across devices.
        </p>
      ) : !isConfigured ? (
        <p className="goal-reflection-journal__status goal-reflection-journal__status--warning">
          Connect Supabase to persist reflections and collaborate with your team.
        </p>
      ) : null}

      {status ? (
        <p
          className={`goal-reflection-journal__status goal-reflection-journal__status--${status.kind}`}
          role="status"
        >
          {status.message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="goal-reflection-journal__status goal-reflection-journal__status--error">{errorMessage}</p>
      ) : null}

      {!isConfigured && !isDemoExperience ? (
        <p className="goal-reflection-journal__empty">
          Add your Supabase credentials to unlock the reflection journal and keep weekly reviews in sync.
        </p>
      ) : goals.length === 0 && !loadingGoals ? (
        <p className="goal-reflection-journal__empty">
          Create a goal first, then return here to log highlights, challenges, and confidence.
        </p>
      ) : (
        <div className="goal-reflection-journal__layout">
          <form className="goal-reflection-journal__form card glass" onSubmit={handleSubmit}>
            <h3>Log a reflection</h3>
            <label className="goal-reflection-journal__field">
              <span>Date</span>
              <input
                type="date"
                value={entryDate}
                max={getTodayISO()}
                onChange={(event) => setEntryDate(event.target.value)}
                required
                disabled={!canJournal}
              />
            </label>
            <label className="goal-reflection-journal__field">
              <span>Confidence</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={confidence}
                onChange={(event) => setConfidence(Number(event.target.value))}
                disabled={!canJournal}
              />
              <div className="goal-reflection-journal__confidence">
                <strong>{formatConfidence(confidence)}</strong>
                <span>{confidenceDescription}</span>
              </div>
            </label>
            <label className="goal-reflection-journal__field">
              <span>Highlight</span>
              <textarea
                value={highlight}
                onChange={(event) => setHighlight(event.target.value)}
                placeholder="Wins, breakthroughs, or learning moments from this week."
                rows={3}
                disabled={!canJournal}
                required
              />
            </label>
            <label className="goal-reflection-journal__field">
              <span>Challenge</span>
              <textarea
                value={challenge}
                onChange={(event) => setChallenge(event.target.value)}
                placeholder="Roadblocks to unblock next week. Optional but encouraged."
                rows={3}
                disabled={!canJournal}
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary goal-reflection-journal__submit"
              disabled={!canJournal || saving}
            >
              {saving ? 'Saving…' : 'Save reflection'}
            </button>
          </form>

          <div className="goal-reflection-journal__history card glass">
            <div className="goal-reflection-journal__history-header">
              <h3>Reflection history</h3>
              <p>
                {selectedGoal
                  ? `Tracking ${reflections.length} reflection${reflections.length === 1 ? '' : 's'} for ${selectedGoal.title}.`
                  : 'Select a goal to view its reflection history.'}
              </p>
            </div>

            <article className="goal-reflection-journal__trend-card card glass">
              <header className="goal-reflection-journal__trend-header">
                <h4>Confidence trendline</h4>
                <p>
                  {loadingReflections
                    ? 'Crunching confidence history…'
                    : confidenceTrend?.summary ??
                      'Log reflections each month to reveal how confidence shifts over time.'}
                </p>
              </header>

              {loadingReflections ? (
                <p className="goal-reflection-journal__trend-empty">Loading trend…</p>
              ) : confidenceTrend && trendChart ? (
                <>
                  <figure className="goal-reflection-journal__trend-chart">
                    <svg
                      viewBox={`0 0 ${trendChart.width} ${trendChart.height}`}
                      role="img"
                      aria-labelledby={trendTitleId}
                    >
                      <title id={trendTitleId}>Confidence trendline</title>
                      <desc>
                        Monthly average confidence scores for {selectedGoal?.title ?? 'the selected goal'}.
                      </desc>
                      <defs>
                        <linearGradient id={`${trendTitleId}-gradient`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <g className="goal-reflection-journal__trend-grid">
                        {trendChart.yTicks.map((tick) => (
                          <g key={tick.value}>
                            <line
                              x1={TREND_CHART_PADDING}
                              x2={trendChart.width - TREND_CHART_PADDING}
                              y1={tick.y}
                              y2={tick.y}
                              className="goal-reflection-journal__trend-gridline"
                            />
                            <text
                              x={TREND_CHART_PADDING - 14}
                              y={tick.y + 4}
                              className="goal-reflection-journal__trend-axis-label"
                            >
                              {tick.value}
                            </text>
                          </g>
                        ))}
                      </g>
                      <path d={trendChart.areaPath} fill={`url(#${trendTitleId}-gradient)`} />
                      <path
                        d={trendChart.path}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={3}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {trendChart.points.map((point) => (
                        <g key={point.label} className="goal-reflection-journal__trend-point">
                          <circle cx={point.cx} cy={point.cy} r={10} fill="none" stroke="#bfdbfe" strokeWidth={2} />
                          <circle cx={point.cx} cy={point.cy} r={6} fill="#2563eb" />
                        </g>
                      ))}
                      <line
                        x1={TREND_CHART_PADDING}
                        x2={trendChart.width - TREND_CHART_PADDING}
                        y1={trendChart.baselineY}
                        y2={trendChart.baselineY}
                        className="goal-reflection-journal__trend-baseline"
                      />
                    </svg>
                  </figure>
                  <ul className="goal-reflection-journal__trend-legend">
                    {confidenceTrend.points.map((point) => (
                      <li key={point.monthKey}>
                        <span className="goal-reflection-journal__trend-month">{point.label}</span>
                        <strong className="goal-reflection-journal__trend-average">{point.average.toFixed(1)}</strong>
                        <span className="goal-reflection-journal__trend-count">
                          {point.entryCount === 1 ? '1 entry' : `${point.entryCount} entries`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="goal-reflection-journal__trend-empty">
                  Log at least one reflection per month to unlock the confidence trendline.
                </p>
              )}
            </article>

            <article className="goal-reflection-journal__prompts-card card glass">
              <header className="goal-reflection-journal__prompts-header">
                <h4>AI-assisted follow-up prompts</h4>
                <p>
                  Turn your latest reflections into next-step coaching experiments that keep the goal moving.
                </p>
              </header>

              {promptError ? (
                <p className="goal-reflection-journal__prompts-status goal-reflection-journal__prompts-status--error">
                  {promptError}
                </p>
              ) : null}

              {loadingPrompts ? (
                <p className="goal-reflection-journal__prompts-status">Generating tailored prompts…</p>
              ) : prompts.length > 0 ? (
                <ul className="goal-reflection-journal__prompts-list">
                  {prompts.map((prompt) => (
                    <li
                      key={prompt.id}
                      className={`goal-reflection-journal__prompt goal-reflection-journal__prompt--${prompt.confidenceSignal}`}
                    >
                      <span className="goal-reflection-journal__prompt-focus">{prompt.focus}</span>
                      <h5>{prompt.title}</h5>
                      <p>{prompt.summary}</p>
                      <ol>
                        {prompt.actions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="goal-reflection-journal__prompts-status">
                  Add a new reflection to unlock tailored next steps for your weekly review.
                </p>
              )}

              {promptSource === 'demo' ? (
                <p className="goal-reflection-journal__prompts-footnote">
                  Prompts are generated locally so you can iterate without Supabase. Connect your Supabase Edge Function
                  named <code>generate-reflection-prompts</code> to power AI-authored guidance for your team.
                </p>
              ) : null}
            </article>

            {loadingReflections ? (
              <p className="goal-reflection-journal__empty">Loading reflections…</p>
            ) : reflections.length === 0 ? (
              <p className="goal-reflection-journal__empty">
                Log your first reflection to start visualizing confidence swings and weekly momentum.
              </p>
            ) : (
              <ul className="goal-reflection-journal__list">
                {reflections.map((reflection) => {
                  const confidenceLabel = formatConfidence(reflection.confidence);
                  const option = reflection.confidence ? confidenceMeta[reflection.confidence] : undefined;
                  return (
                  <li key={reflection.id} className="goal-reflection-journal__item card glass">
                      <header>
                        <div>
                          <h4>{formatDateLabel(reflection.entry_date)}</h4>
                          <p className="goal-reflection-journal__confidence-label">{confidenceLabel}</p>
                          {option ? (
                            <p className="goal-reflection-journal__confidence-description">{option.description}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(reflection)}
                          className="btn btn--ghost goal-reflection-journal__delete"
                          disabled={deletingId === reflection.id || saving}
                        >
                          {deletingId === reflection.id ? 'Removing…' : 'Delete'}
                        </button>
                      </header>
                      <div className="goal-reflection-journal__note">
                        <h5>Highlight</h5>
                        <p>{reflection.highlight}</p>
                      </div>
                      {reflection.challenge ? (
                        <div className="goal-reflection-journal__note goal-reflection-journal__note--challenge">
                          <h5>Challenge</h5>
                          <p>{reflection.challenge}</p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
