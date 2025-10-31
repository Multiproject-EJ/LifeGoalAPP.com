import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchCheckinsForUser, insertCheckin, updateCheckin } from '../../services/checkins';
import type { Database } from '../../lib/database.types';

type CheckinRow = Database['public']['Tables']['checkins']['Row'];

type LifeWheelCheckinsProps = {
  session: Session;
};

const LIFE_WHEEL_CATEGORIES = [
  { key: 'health', label: 'Health' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'career', label: 'Career' },
  { key: 'personal_growth', label: 'Personal growth' },
  { key: 'fun', label: 'Fun' },
  { key: 'finances', label: 'Finances' },
  { key: 'giving_back', label: 'Giving back' },
  { key: 'environment', label: 'Environment' },
] as const;

type LifeWheelCategory = (typeof LIFE_WHEEL_CATEGORIES)[number];

type LifeWheelCategoryKey = LifeWheelCategory['key'];

type CheckinScores = Record<LifeWheelCategoryKey, number>;

type RadarGeometry = {
  polygonPoints: string;
  levelPolygons: { ratio: number; points: string }[];
  axes: { key: string; x1: number; y1: number; x2: number; y2: number }[];
  labels: {
    key: string;
    text: string;
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
  }[];
};

const MAX_SCORE = 10;
const RADAR_SIZE = 320;
const RADAR_LEVELS = 5;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDefaultScores(): CheckinScores {
  return LIFE_WHEEL_CATEGORIES.reduce<CheckinScores>((acc, category) => {
    acc[category.key] = 5;
    return acc;
  }, {} as CheckinScores);
}

function parseCheckinScores(scores: CheckinRow['scores']): CheckinScores {
  const fallback = createDefaultScores();
  if (scores && typeof scores === 'object' && !Array.isArray(scores)) {
    const record = scores as Record<string, unknown>;
    for (const category of LIFE_WHEEL_CATEGORIES) {
      const value = record[category.key];
      fallback[category.key] = typeof value === 'number' ? clampScore(value) : 0;
    }
  }
  return fallback;
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, Math.round(value)));
}

function calculateAverage(scores: CheckinScores): number {
  const total = LIFE_WHEEL_CATEGORIES.reduce((sum, category) => sum + (scores[category.key] ?? 0), 0);
  return Number((total / LIFE_WHEEL_CATEGORIES.length).toFixed(1));
}

type TrendDelta = {
  key: LifeWheelCategoryKey;
  label: string;
  delta: number;
  latest: number;
  previous: number;
};

type TrendInsights = {
  previousLabel: string;
  latestAverage: number;
  previousAverage: number;
  averageDelta: number;
  averageDirection: 'up' | 'down' | 'steady';
  improvements: TrendDelta[];
  declines: TrendDelta[];
  stableCount: number;
};

function createTrendInsights(checkins: CheckinRow[]): TrendInsights | null {
  if (checkins.length < 2) {
    return null;
  }

  const [latest, previous] = checkins;
  const latestScores = parseCheckinScores(latest.scores);
  const previousScores = parseCheckinScores(previous.scores);

  const deltas = LIFE_WHEEL_CATEGORIES.map<TrendDelta>((category) => {
    const latestValue = clampScore(latestScores[category.key] ?? 0);
    const previousValue = clampScore(previousScores[category.key] ?? 0);
    return {
      key: category.key,
      label: category.label,
      delta: latestValue - previousValue,
      latest: latestValue,
      previous: previousValue,
    };
  });

  const improvements = deltas
    .filter((item) => item.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  const declines = deltas
    .filter((item) => item.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  const stableCount = deltas.filter((item) => item.delta === 0).length;

  const latestAverage = calculateAverage(latestScores);
  const previousAverage = calculateAverage(previousScores);
  const rawAverageDelta = Number((latestAverage - previousAverage).toFixed(1));
  const averageDelta = Math.abs(rawAverageDelta) < 0.05 ? 0 : rawAverageDelta;
  const averageDirection = averageDelta > 0 ? 'up' : averageDelta < 0 ? 'down' : 'steady';

  return {
    previousLabel: dateFormatter.format(new Date(previous.date)),
    latestAverage,
    previousAverage,
    averageDelta,
    averageDirection,
    improvements,
    declines,
    stableCount,
  };
}

function formatSignedInteger(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}`;
}

function formatSignedDecimal(value: number, fractionDigits = 1): string {
  if (Math.abs(value) < 0.05) return '0';
  const rounded = Math.abs(value).toFixed(fractionDigits);
  return `${value > 0 ? '+' : '−'}${rounded}`;
}

function buildRadarGeometry(scores: CheckinScores): RadarGeometry {
  const center = RADAR_SIZE / 2;
  const radius = center - 36;

  const pointFor = (ratio: number, index: number) => {
    const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const x = center + Math.cos(angle) * radius * ratio;
    const y = center + Math.sin(angle) * radius * ratio;
    return { x, y };
  };

  const polygonPoints = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const score = clampScore(scores[category.key] ?? 0);
    const ratio = score / MAX_SCORE;
    const { x, y } = pointFor(ratio, index);
    return `${x},${y}`;
  }).join(' ');

  const levelPolygons = Array.from({ length: RADAR_LEVELS }, (_, levelIndex) => {
    const ratio = (levelIndex + 1) / RADAR_LEVELS;
    const points = LIFE_WHEEL_CATEGORIES.map((_, index) => {
      const { x, y } = pointFor(ratio, index);
      return `${x},${y}`;
    }).join(' ');
    return { ratio, points };
  });

  const axes = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const { x, y } = pointFor(1, index);
    return { key: category.key, x1: center, y1: center, x2: x, y2: y };
  });

  const labels = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const labelRadius = radius + 20;
    const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const x = center + Math.cos(angle) * labelRadius;
    const y = center + Math.sin(angle) * labelRadius;

    let anchor: 'start' | 'middle' | 'end';
    if (Math.abs(Math.cos(angle)) < 0.2) {
      anchor = 'middle';
    } else if (Math.cos(angle) > 0) {
      anchor = 'start';
    } else {
      anchor = 'end';
    }

    let baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
    if (Math.sin(angle) > 0.2) {
      baseline = 'text-before-edge';
    } else if (Math.sin(angle) < -0.2) {
      baseline = 'text-after-edge';
    } else {
      baseline = 'middle';
    }

    return { key: category.key, text: category.label, x, y, anchor, baseline };
  });

  return { polygonPoints, levelPolygons, axes, labels };
}

export function LifeWheelCheckins({ session }: LifeWheelCheckinsProps) {
  const { isConfigured, mode } = useSupabaseAuth();
  const isDemoMode = mode === 'demo';
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(() => formatISODate(new Date()));
  const [formScores, setFormScores] = useState<CheckinScores>(() => createDefaultScores());
  const [selectedCheckinId, setSelectedCheckinId] = useState<string | null>(null);

  const loadCheckins = useCallback(async () => {
    if (!isConfigured && !isDemoMode) {
      setCheckins([]);
      setSelectedCheckinId(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await fetchCheckinsForUser(session.user.id);
      if (error) throw error;
      const records = data ?? [];
      setCheckins(records);
      if (records.length > 0) {
        setSelectedCheckinId((current) => current ?? records[0].id);
      } else {
        setSelectedCheckinId(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load check-in history right now. Please try again soon.',
      );
    } finally {
      setLoading(false);
    }
  }, [isConfigured, isDemoMode, session.user.id]);

  useEffect(() => {
    if (!session || (!isConfigured && !isDemoMode)) {
      return;
    }
    void loadCheckins();
  }, [session?.user?.id, isConfigured, isDemoMode, loadCheckins]);

  useEffect(() => {
    if (!isConfigured && !isDemoMode) {
      setCheckins([]);
      setSelectedCheckinId(null);
    }
  }, [isConfigured, isDemoMode]);

  useEffect(() => {
    if (checkins.length === 0) {
      setFormScores(createDefaultScores());
      return;
    }
    const latest = checkins[0];
    setFormScores(parseCheckinScores(latest.scores));
  }, [checkins]);

  const selectedCheckin = useMemo(() => {
    if (!selectedCheckinId) {
      return checkins[0] ?? null;
    }
    return checkins.find((item) => item.id === selectedCheckinId) ?? null;
  }, [selectedCheckinId, checkins]);

  const selectedScores = useMemo(() => {
    return selectedCheckin ? parseCheckinScores(selectedCheckin.scores) : null;
  }, [selectedCheckin]);

  const radarGeometry = useMemo(() => {
    return selectedScores ? buildRadarGeometry(selectedScores) : null;
  }, [selectedScores]);

  const averageScore = useMemo(() => {
    return selectedScores ? calculateAverage(selectedScores) : 0;
  }, [selectedScores]);

  const trendInsights = useMemo(() => createTrendInsights(checkins), [checkins]);

  const handleScoreChange = (categoryKey: LifeWheelCategoryKey) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = clampScore(Number(event.target.value));
      setFormScores((current) => ({ ...current, [categoryKey]: value }));
    };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!session) {
      setErrorMessage('Sign in to record your life wheel check-ins.');
      return;
    }

    if (!isConfigured && !isDemoMode) {
      setErrorMessage('Supabase credentials are missing. Update your environment variables to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const existing = checkins.find((item) => item.date === formDate);
      if (existing) {
        const { data, error } = await updateCheckin(existing.id, {
          date: formDate,
          scores: formScores,
        });
        if (error) throw error;
        if (data) {
          setCheckins((current) => {
            const mapped = current.map((item) => (item.id === data.id ? data : item));
            return mapped.sort((a, b) => b.date.localeCompare(a.date));
          });
          setSelectedCheckinId(data.id);
        }
        setSuccessMessage('Check-in updated. Your radar view is refreshed.');
      } else {
        const { data, error } = await insertCheckin({
          user_id: session.user.id,
          date: formDate,
          scores: formScores,
        });
        if (error) throw error;
        if (data) {
          setCheckins((current) => {
            const next = [data, ...current];
            return next.sort((a, b) => b.date.localeCompare(a.date));
          });
          setSelectedCheckinId(data.id);
        }
        setSuccessMessage('Check-in saved! Revisit the history to spot your trends.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your check-in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseLatestScores = () => {
    if (checkins.length === 0) {
      setFormScores(createDefaultScores());
      return;
    }
    setFormScores(parseCheckinScores(checkins[0].scores));
  };

  return (
    <section className="life-wheel">
      <header className="life-wheel__header">
        <div>
          <h2>Life wheel check-ins</h2>
          <p>
            Capture how balanced your life feels across core categories, then watch the radar chart surface your highs and
            lows over time.
          </p>
        </div>
        <button
          type="button"
          className="life-wheel__refresh"
          onClick={() => void loadCheckins()}
          disabled={loading || (!isConfigured && !isDemoMode)}
        >
          {loading ? 'Refreshing…' : 'Refresh history'}
        </button>
      </header>

      {isDemoMode ? (
        <p className="life-wheel__status life-wheel__status--info">
          Life wheel entries are stored locally in demo mode. Connect Supabase when you&apos;re ready to sync check-ins across
          devices.
        </p>
      ) : !isConfigured ? (
        <p className="life-wheel__status life-wheel__status--warning">
          Add your Supabase credentials so we can sync your check-ins across devices. Until then your entries stay local.
        </p>
      ) : null}

      {errorMessage && <p className="life-wheel__status life-wheel__status--error">{errorMessage}</p>}
      {successMessage && <p className="life-wheel__status life-wheel__status--success">{successMessage}</p>}

      <div className="life-wheel__grid">
        <div className="life-wheel__panel life-wheel__panel--chart">
          {selectedCheckin && radarGeometry ? (
            <>
              <svg
                className="life-wheel__radar"
                viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                role="img"
                aria-label={`Life wheel radar chart for ${dateFormatter.format(new Date(selectedCheckin.date))}`}
              >
                <g className="life-wheel__radar-grid">
                  {radarGeometry.levelPolygons.map((level) => (
                    <polygon key={level.ratio} points={level.points} />
                  ))}
                </g>
                <g className="life-wheel__radar-axes">
                  {radarGeometry.axes.map((axis) => (
                    <line key={axis.key} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} />
                  ))}
                </g>
                <polygon className="life-wheel__radar-shape" points={radarGeometry.polygonPoints} />
                <g className="life-wheel__radar-labels">
                  {radarGeometry.labels.map((label) => (
                    <text
                      key={label.key}
                      x={label.x}
                      y={label.y}
                      textAnchor={label.anchor}
                      dominantBaseline={label.baseline}
                    >
                      {label.text}
                    </text>
                  ))}
                </g>
              </svg>
              <div className="life-wheel__snapshot">
                <h3>{dateFormatter.format(new Date(selectedCheckin.date))}</h3>
                <p>
                  Average score: <strong>{averageScore}</strong>/10. Track improvements by logging a new check-in whenever
                  your priorities shift.
                </p>
              </div>
            </>
          ) : (
            <div className="life-wheel__empty">
              <p>Log your first check-in to unlock the radar chart and trend history.</p>
            </div>
          )}

          <div className="life-wheel__history">
            <h3>Recent check-ins</h3>
            {checkins.length === 0 ? (
              <p>No check-ins yet. Share how each area feels to begin your streak.</p>
            ) : (
              <ul>
                {checkins.map((checkin) => {
                  const isActive = selectedCheckin ? checkin.id === selectedCheckin.id : false;
                  const scores = parseCheckinScores(checkin.scores);
                  const average = calculateAverage(scores);
                  return (
                    <li key={checkin.id}>
                      <button
                        type="button"
                        className={`life-wheel__history-item ${isActive ? 'life-wheel__history-item--active' : ''}`}
                        onClick={() => setSelectedCheckinId(checkin.id)}
                      >
                        <span>{dateFormatter.format(new Date(checkin.date))}</span>
                        <span>{average}/10 avg</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="life-wheel__insights">
            <div className="life-wheel__insights-header">
              <h3>Trend insights</h3>
              <p>
                {trendInsights
                  ? trendInsights.averageDirection === 'steady'
                    ? `Overall balance held steady compared to ${trendInsights.previousLabel}.`
                    : `Overall balance ${
                        trendInsights.averageDirection === 'up' ? 'improved' : 'dipped'
                      } by ${formatSignedDecimal(trendInsights.averageDelta)} points compared to ${
                        trendInsights.previousLabel
                      }.`
                  : 'Log at least two check-ins to unlock week-over-week highlights.'}
              </p>
            </div>

            {trendInsights ? (
              <>
                <p className="life-wheel__insights-meta">
                  Latest average <strong>{trendInsights.latestAverage.toFixed(1)}</strong>/10 • Previous{' '}
                  <strong>{trendInsights.previousAverage.toFixed(1)}</strong>/10
                </p>
                <div className="life-wheel__insight-cards">
                  <section className="life-wheel__insight-card life-wheel__insight-card--lift">
                    <h4>Where you gained momentum</h4>
                    {trendInsights.improvements.length > 0 ? (
                      <ul className="life-wheel__insight-list">
                        {trendInsights.improvements.map((item) => (
                          <li key={item.key}>
                            <span className="life-wheel__insight-label">{item.label}</span>
                            <span className="life-wheel__insight-delta life-wheel__insight-delta--positive">
                              {formatSignedInteger(item.delta)}
                            </span>
                            <span className="life-wheel__insight-score">Now {item.latest}/10</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="life-wheel__insight-empty">No gains yet—celebrate a win with your next check-in.</p>
                    )}
                  </section>

                  <section className="life-wheel__insight-card life-wheel__insight-card--dip">
                    <h4>Where to focus next</h4>
                    {trendInsights.declines.length > 0 ? (
                      <ul className="life-wheel__insight-list">
                        {trendInsights.declines.map((item) => (
                          <li key={item.key}>
                            <span className="life-wheel__insight-label">{item.label}</span>
                            <span className="life-wheel__insight-delta life-wheel__insight-delta--negative">
                              {formatSignedInteger(item.delta)}
                            </span>
                            <span className="life-wheel__insight-score">Now {item.latest}/10</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="life-wheel__insight-empty">No dips detected—keep nurturing these areas.</p>
                    )}
                  </section>
                </div>
                {trendInsights.stableCount > 0 ? (
                  <p className="life-wheel__insights-stable">
                    {trendInsights.stableCount} {trendInsights.stableCount === 1 ? 'area' : 'areas'} held steady. Consistency
                    counts.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="life-wheel__panel life-wheel__panel--form">
          <form className="life-wheel__form" onSubmit={handleFormSubmit}>
            <div className="life-wheel__field">
              <label htmlFor="life-wheel-date">Check-in date</label>
              <input
                id="life-wheel-date"
                type="date"
                value={formDate}
                max={formatISODate(new Date())}
                onChange={(event) => setFormDate(event.target.value)}
                required
              />
            </div>

            <div className="life-wheel__field-group">
              {LIFE_WHEEL_CATEGORIES.map((category) => (
                <div className="life-wheel__field" key={category.key}>
                  <label htmlFor={`life-wheel-${category.key}`}>{category.label}</label>
                  <div className="life-wheel__slider">
                    <input
                      id={`life-wheel-${category.key}`}
                      type="range"
                      min={0}
                      max={MAX_SCORE}
                      step={1}
                      value={formScores[category.key] ?? 0}
                      onChange={handleScoreChange(category.key)}
                    />
                    <span>{formScores[category.key] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="life-wheel__actions">
              <button type="button" className="life-wheel__secondary" onClick={handleUseLatestScores}>
                Use latest scores
              </button>
              <button type="submit" className="life-wheel__primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save check-in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
