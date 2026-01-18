import { useMemo, useState } from 'react';

const HAIRCUT_INTERVAL_OPTIONS = [
  { value: 60, label: 'Every 2 months (60 days)' },
  { value: 75, label: 'Every 2-3 months (75 days)' },
  { value: 90, label: 'Every 3 months (90 days)' },
] as const;

const HAIRCUT_STYLES = [
  { key: 'classic_taper', label: 'Classic taper', tone: 'Clean + sharp' },
  { key: 'soft_layers', label: 'Soft layers', tone: 'Natural + airy' },
  { key: 'textured_crop', label: 'Textured crop', tone: 'Modern + bold' },
] as const;

type HaircutStyleKey = (typeof HAIRCUT_STYLES)[number]['key'];

const HAIRCUT_LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
] as const;

type HaircutLengthValue = (typeof HAIRCUT_LENGTHS)[number]['value'];

function formatDateLabel(value: string | null): string {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue: string | null, days: number): string | null {
  if (!dateValue) return null;
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next.toISOString();
}

export function BodyHaircutWidget() {
  const [isHaircutExpanded, setIsHaircutExpanded] = useState(true);
  const [haircutIntervalDays, setHaircutIntervalDays] = useState(75);
  const [lastHaircutDate, setLastHaircutDate] = useState(() => formatISODate(new Date()));
  const [selectedHaircutStyle, setSelectedHaircutStyle] = useState<HaircutStyleKey>(HAIRCUT_STYLES[0].key);
  const [bestHairLength, setBestHairLength] = useState<HaircutLengthValue>(HAIRCUT_LENGTHS[1].value);
  const [needsHaircut, setNeedsHaircut] = useState(false);

  const nextHaircutDate = addDays(lastHaircutDate, haircutIntervalDays);
  const haircutDaysSince = useMemo(() => {
    const parsed = new Date(lastHaircutDate);
    if (Number.isNaN(parsed.getTime())) return 0;
    const diff = Date.now() - parsed.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [lastHaircutDate]);
  const haircutProgress =
    haircutIntervalDays > 0
      ? Math.min(100, Math.round((haircutDaysSince / haircutIntervalDays) * 100))
      : 0;

  return (
    <section className="body-habits">
      <header className="body-habits__header">
        <div>
          <h2>Body</h2>
          <p>
            Your body tab starts with haircut rhythm tracking. Expand for style selections, reminders, and reset actions.
          </p>
        </div>
      </header>

      <section
        className={`vision-board__haircut-widget ${
          isHaircutExpanded ? 'vision-board__haircut-widget--expanded' : ''
        }`}
      >
        <button
          type="button"
          className="vision-board__haircut-toggle"
          aria-expanded={isHaircutExpanded}
          onClick={() => setIsHaircutExpanded((prev) => !prev)}
        >
          <div>
            <p className="vision-board__haircut-kicker">My Haircut</p>
            <h3 className="vision-board__haircut-title">Haircut rhythm & reminders</h3>
            <p className="vision-board__haircut-subtitle">
              Interval:{' '}
              {HAIRCUT_INTERVAL_OPTIONS.find((option) => option.value === haircutIntervalDays)?.label ?? 'Custom'} ·
              Next reminder {formatDateLabel(nextHaircutDate)}
            </p>
          </div>
          <span className="vision-board__haircut-toggle-icon" aria-hidden>
            {isHaircutExpanded ? '−' : '+'}
          </span>
        </button>
        {isHaircutExpanded && (
          <div className="vision-board__haircut-details">
            <div className="vision-board__haircut-section">
              <h4>My haircut selection</h4>
              <div className="vision-board__haircut-style-grid" role="radiogroup" aria-label="Select haircut style">
                {HAIRCUT_STYLES.map((style) => (
                  <button
                    key={style.key}
                    type="button"
                    role="radio"
                    aria-checked={selectedHaircutStyle === style.key}
                    className={`vision-board__haircut-style ${
                      selectedHaircutStyle === style.key ? 'vision-board__haircut-style--active' : ''
                    }`}
                    onClick={() => setSelectedHaircutStyle(style.key)}
                  >
                    <span className="vision-board__haircut-style-swatch" aria-hidden />
                    <span>
                      <strong>{style.label}</strong>
                      <span>{style.tone}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="vision-board__haircut-section">
              <h4>Reminders & reset</h4>
              <div className="vision-board__haircut-inputs">
                <label>
                  Last haircut
                  <input
                    type="date"
                    value={lastHaircutDate}
                    onChange={(event) => setLastHaircutDate(event.target.value)}
                  />
                </label>
                <label>
                  Interval
                  <select
                    value={haircutIntervalDays}
                    onChange={(event) => setHaircutIntervalDays(Number(event.target.value))}
                  >
                    {HAIRCUT_INTERVAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Best length
                  <select
                    value={bestHairLength}
                    onChange={(event) => setBestHairLength(event.target.value as HaircutLengthValue)}
                  >
                    {HAIRCUT_LENGTHS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="vision-board__haircut-actions">
                <button
                  type="button"
                  className="vision-board__haircut-reset"
                  onClick={() => {
                    setLastHaircutDate(formatISODate(new Date()));
                    setNeedsHaircut(false);
                  }}
                >
                  Just had a haircut
                </button>
                <button
                  type="button"
                  className="vision-board__haircut-alert"
                  onClick={() => setNeedsHaircut(true)}
                >
                  Hair feels too long
                </button>
              </div>
              <p className={`vision-board__haircut-status ${needsHaircut ? 'vision-board__haircut-status--alert' : ''}`}>
                {needsHaircut ? 'Time for a trim — consider booking a cut.' : 'On track with your ideal length.'}
              </p>
            </div>
          </div>
        )}
        <div
          className="vision-board__haircut-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={haircutProgress}
        >
          <div className="vision-board__haircut-progress-bar" style={{ width: `${haircutProgress}%` }} />
        </div>
        <p className="vision-board__haircut-progress-label">
          {haircutDaysSince} days since your last cut · {haircutProgress}% toward your next one
        </p>
      </section>
    </section>
  );
}
