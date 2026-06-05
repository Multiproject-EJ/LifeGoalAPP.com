import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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

const BODY_GOAL_CATEGORIES = [
  { key: 'hair', label: 'Hair', icon: '💇', summary: 'Cut rhythm, care plan, style notes, and reminders.' },
  { key: 'face_skin', label: 'Face & skin', icon: '✨', summary: 'Cleanse, sunscreen, glow, and skin recovery goals.' },
  { key: 'teeth_mouth', label: 'Teeth & mouth', icon: '😁', summary: 'Brushing, flossing, dentist visits, and breath care.' },
  { key: 'neck_posture', label: 'Neck & posture', icon: '🧘', summary: 'Desk posture, neck mobility, and tension resets.' },
  { key: 'shoulders_arms', label: 'Shoulders & arms', icon: '💪', summary: 'Strength, mobility, grip, and upper-body care.' },
  { key: 'chest_core', label: 'Chest & core', icon: '🔥', summary: 'Breathing, core strength, digestion, and torso goals.' },
  { key: 'legs_mobility', label: 'Legs & mobility', icon: '🏃', summary: 'Hips, knees, walking stamina, flexibility, and balance.' },
  { key: 'feet_recovery', label: 'Feet & recovery', icon: '🦶', summary: 'Foot care, sleep recovery, stretching, and pain prevention.' },
] as const;

const HAIR_GOAL_OPTIONS = [
  { value: 'fresh_shape', label: 'Keep a fresh shape' },
  { value: 'grow_out', label: 'Grow it out neatly' },
  { value: 'repair', label: 'Repair dryness or breakage' },
] as const;

const HAIR_WASH_CADENCES = [
  { value: '2_3_week', label: '2–3× / week' },
  { value: 'every_other_day', label: 'Every other day' },
  { value: 'daily_light', label: 'Daily light rinse' },
] as const;

const HAIR_SCALP_FOCUS = [
  { value: 'balanced', label: 'Balanced scalp' },
  { value: 'dry', label: 'Dry / flaky care' },
  { value: 'oily', label: 'Oil control' },
] as const;

type HairGoalValue = (typeof HAIR_GOAL_OPTIONS)[number]['value'];
type HairWashCadenceValue = (typeof HAIR_WASH_CADENCES)[number]['value'];
type HairScalpFocusValue = (typeof HAIR_SCALP_FOCUS)[number]['value'];

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

type BodyHaircutWidgetProps = {
  onOpenHealthGoalsQuestMenu?: () => void;
};

export function BodyHaircutWidget({ onOpenHealthGoalsQuestMenu }: BodyHaircutWidgetProps = {}) {
  const [isHairModalOpen, setIsHairModalOpen] = useState(false);
  const [haircutIntervalDays, setHaircutIntervalDays] = useState(75);
  const [lastHaircutDate, setLastHaircutDate] = useState(() => formatISODate(new Date()));
  const [selectedHaircutStyle, setSelectedHaircutStyle] = useState<HaircutStyleKey>(HAIRCUT_STYLES[0].key);
  const [bestHairLength, setBestHairLength] = useState<HaircutLengthValue>(HAIRCUT_LENGTHS[1].value);
  const [needsHaircut, setNeedsHaircut] = useState(false);
  const [hairGoal, setHairGoal] = useState<HairGoalValue>(HAIR_GOAL_OPTIONS[0].value);
  const [washCadence, setWashCadence] = useState<HairWashCadenceValue>(HAIR_WASH_CADENCES[0].value);
  const [scalpFocus, setScalpFocus] = useState<HairScalpFocusValue>(HAIR_SCALP_FOCUS[0].value);

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

  useEffect(() => {
    if (!isHairModalOpen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHairModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHairModalOpen]);

  const hairModal =
    isHairModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="body-habits-modal" role="dialog" aria-modal="true" aria-labelledby="body-hair-modal-title">
            <button
              type="button"
              className="body-habits-modal__backdrop"
              aria-label="Close hair goals"
              onClick={() => setIsHairModalOpen(false)}
            />
            <div className="body-habits-modal__panel" role="document">
              <div className="body-habits-modal__header">
                <div>
                  <p className="vision-board__haircut-kicker">Body goals</p>
                  <h3 id="body-hair-modal-title">Hair</h3>
                  <p>
                    Haircut rhythm, style choices, scalp care, wash cadence, and maintenance notes in one place.
                  </p>
                </div>
                <button
                  type="button"
                  className="body-habits-modal__close"
                  aria-label="Close hair goals"
                  onClick={() => setIsHairModalOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="vision-board__haircut-details">
                <div className="vision-board__haircut-section">
                  <h4>Hair goal</h4>
                  <div className="body-habits__chip-grid" role="radiogroup" aria-label="Select hair goal">
                    {HAIR_GOAL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={hairGoal === option.value}
                        className={`body-habits__chip ${hairGoal === option.value ? 'body-habits__chip--active' : ''}`}
                        onClick={() => setHairGoal(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                  <h4>Care rhythm</h4>
                  <div className="vision-board__haircut-inputs">
                    <label>
                      Wash cadence
                      <select value={washCadence} onChange={(event) => setWashCadence(event.target.value as HairWashCadenceValue)}>
                        {HAIR_WASH_CADENCES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Scalp focus
                      <select value={scalpFocus} onChange={(event) => setScalpFocus(event.target.value as HairScalpFocusValue)}>
                        {HAIR_SCALP_FOCUS.map((option) => (
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

                <div className="vision-board__haircut-section">
                  <h4>Maintenance checklist</h4>
                  <ul className="body-habits__care-list">
                    <li>Book or trim when the reminder date arrives: {formatDateLabel(nextHaircutDate)}.</li>
                    <li>Save a reference photo for your next cut or styling session.</li>
                    <li>Check product fit: shampoo, conditioner, styling product, and heat protection.</li>
                    <li>Protect hair overnight with a low-friction pillowcase or gentle wrap when useful.</li>
                  </ul>
                </div>

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
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className="body-habits">
      <header className="body-habits__header">
        <div>
          <h2>Body</h2>
          <p>
            Start at the top of the body and work downward through personal-care, strength, mobility, and recovery goals.
          </p>
        </div>
        <button type="button" className="body-habits__quest-link" onClick={onOpenHealthGoalsQuestMenu}>
          Open Health Goals in Quest Menu
        </button>
      </header>

      <div className="body-habits__category-grid" aria-label="Body goal categories">
        {BODY_GOAL_CATEGORIES.map((category) => {
          const isHair = category.key === 'hair';
          return (
            <button
              key={category.key}
              type="button"
              className={`body-habits__category ${isHair ? 'body-habits__category--hair' : ''}`}
              onClick={isHair ? () => setIsHairModalOpen(true) : undefined}
              disabled={!isHair}
            >
              <span className="body-habits__category-icon" aria-hidden>{category.icon}</span>
              <span>
                <strong>{category.label}</strong>
                <span>{category.summary}</span>
              </span>
              {isHair ? <em>Open</em> : <em>Coming soon</em>}
            </button>
          );
        })}
      </div>

      {hairModal}
    </section>
  );
}
