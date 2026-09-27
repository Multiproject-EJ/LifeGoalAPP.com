import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advancePrecisionBuild,
  createPrecisionBuildState,
  judgePrecisionTap,
  precisionFeedbackLabel,
  precisionMarkerDeg,
  PRECISION_BUILD_PERFECT_SHARE,
  type PrecisionBuildJudgement,
} from '../services/precisionBuild';
import './precision-build.css';

const BEST_KEY = 'lifegoal:precision-build:best-streak';
const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function readBest(): number {
  try { return Number(window.localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function writeBest(value: number) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode */ }
}

type Props = {
  disabled: boolean;
  costLabel: string;
  /** Performs one ordinary build step; resolves false when nothing was built. */
  onHit: () => Promise<boolean>;
};

/**
 * Tap BUILD while the sweeping marker is inside the golden arc. A hit builds
 * one step (same cost as always); a miss costs nothing. Streaks narrow the
 * arc and speed the marker up.
 */
export function PrecisionBuildRing({ disabled, costLabel, onHit }: Props) {
  const [state, setState] = useState(() => createPrecisionBuildState(readBest()));
  const [feedback, setFeedback] = useState<{ id: number; judgement: PrecisionBuildJudgement; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const markerRef = useRef<SVGGElement>(null);
  const clockRef = useRef({ start: performance.now(), speed: state.speedDegPerSec });

  // Keep the marker continuous when speed changes: re-base the clock at the current angle.
  if (clockRef.current.speed !== state.speedDegPerSec) {
    const now = performance.now();
    const angle = precisionMarkerDeg(now - clockRef.current.start, clockRef.current.speed);
    clockRef.current = { start: now - (angle / state.speedDegPerSec) * 1000, speed: state.speedDegPerSec };
  }

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const angle = precisionMarkerDeg(performance.now() - clockRef.current.start, clockRef.current.speed);
      markerRef.current?.setAttribute('transform', `rotate(${angle.toFixed(2)} 50 50)`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const tap = useCallback(async () => {
    if (disabled || busy) return;
    const angle = precisionMarkerDeg(performance.now() - clockRef.current.start, clockRef.current.speed);
    const judgement = judgePrecisionTap(angle, state);
    const id = Date.now();
    if (judgement === 'miss') {
      setState(advancePrecisionBuild(state, 'miss'));
      setFeedback({ id, judgement, label: precisionFeedbackLabel('miss', 0) });
      return;
    }
    setBusy(true);
    try {
      const built = await onHit();
      if (!built) return;
      const next = advancePrecisionBuild(state, judgement);
      if (next.bestStreak > state.bestStreak) writeBest(next.bestStreak);
      setState(next);
      setFeedback({ id, judgement, label: precisionFeedbackLabel(judgement, next.streak) });
    } finally {
      setBusy(false);
    }
  }, [busy, disabled, onHit, state]);

  const zoneLength = (state.zoneDeg / 360) * CIRCUMFERENCE;
  const perfectDeg = state.zoneDeg * PRECISION_BUILD_PERFECT_SHARE;
  const perfectLength = (perfectDeg / 360) * CIRCUMFERENCE;

  return (
    <div className={`precision-build${disabled ? ' precision-build--disabled' : ''}`}>
      <div className="precision-build__stats" aria-live="polite">
        <span className={`precision-build__streak${state.streak >= 3 ? ' is-hot' : ''}`}>🔥 {state.streak}</span>
        <span className="precision-build__best">Best {state.bestStreak}</span>
      </div>
      <button
        type="button"
        className="precision-build__ring"
        disabled={disabled}
        onPointerDown={(event) => {
          event.preventDefault();
          void tap();
        }}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault();
            void tap();
          }
        }}
        aria-label={`Precision build: tap when the marker is inside the golden arc to build one step for ${costLabel}. A miss costs nothing.`}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="precision-build__track" cx="50" cy="50" r={RADIUS} />
          <circle
            key={`zone-${state.attempt}`}
            className="precision-build__zone"
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={`${zoneLength} ${CIRCUMFERENCE}`}
            transform={`rotate(${state.targetDeg - state.zoneDeg / 2 - 90} 50 50)`}
          />
          <circle
            className="precision-build__perfect"
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={`${perfectLength} ${CIRCUMFERENCE}`}
            transform={`rotate(${state.targetDeg - perfectDeg / 2 - 90} 50 50)`}
          />
          <g ref={markerRef}>
            <line className="precision-build__marker-line" x1="50" y1="50" x2="50" y2="4" />
            <circle className="precision-build__marker" cx="50" cy={50 - RADIUS} r="4.2" />
          </g>
        </svg>
        <span className="precision-build__core">
          <strong>{busy ? '⚒️' : 'BUILD'}</strong>
          <small>{costLabel}</small>
        </span>
      </button>
      {feedback ? (
        <span key={feedback.id} className={`precision-build__feedback precision-build__feedback--${feedback.judgement}`} role="status">
          {feedback.label}
        </span>
      ) : null}
      <p className="precision-build__hint">Tap when the marker hits the gold · misses are free</p>
    </div>
  );
}
