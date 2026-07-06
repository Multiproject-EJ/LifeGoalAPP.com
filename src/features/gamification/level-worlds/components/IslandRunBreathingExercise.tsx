import { useEffect, useMemo, useState } from 'react';

/**
 * A real, paced breathing exercise for the Mystery stop's `breathing` variant.
 *
 * Replaces the previous one-tap "Complete Breathing Exercise" placeholder with
 * an actual guided inhale → hold → exhale animation across a few cycles, so the
 * Mystery slot offers a genuinely different, calming beat instead of always
 * funnelling into the check-in reflection. Self-contained and presentational —
 * completion is reported via `onComplete`; the parent owns stop completion.
 *
 * Motion is driven by an inline transition duration (phases have different
 * lengths) and is disabled when the viewer prefers reduced motion, in which case
 * the orb simply snaps between sizes while the paced labels/timing still guide
 * the breath.
 */

type BreathPhase = {
  key: 'inhale' | 'hold' | 'exhale';
  label: string;
  seconds: number;
  /** Orb scale target for this phase (0..1 of the max size). */
  scale: number;
};

const PHASES: readonly BreathPhase[] = [
  { key: 'inhale', label: 'Breathe in', seconds: 4, scale: 1 },
  { key: 'hold', label: 'Hold', seconds: 4, scale: 1 },
  { key: 'exhale', label: 'Breathe out', seconds: 6, scale: 0.55 },
];

const CYCLES = 3;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface IslandRunBreathingExerciseProps {
  onComplete: (message: string) => void;
}

export function IslandRunBreathingExercise({ onComplete }: IslandRunBreathingExerciseProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);
  const reducedMotion = useMemo(prefersReducedMotion, []);

  // Flattened phase sequence: PHASES repeated CYCLES times.
  const sequence = useMemo(
    () => Array.from({ length: CYCLES }, () => PHASES).flat(),
    [],
  );

  const currentPhase = sequence[stepIndex] ?? PHASES[PHASES.length - 1];
  const currentCycle = Math.floor(stepIndex / PHASES.length) + 1;

  // Advance through the phase sequence while running.
  useEffect(() => {
    if (status !== 'running') return undefined;

    if (stepIndex >= sequence.length) {
      setStatus('done');
      return undefined;
    }

    setRemaining(sequence[stepIndex].seconds);
    const phaseMs = sequence[stepIndex].seconds * 1000;
    const advance = window.setTimeout(() => setStepIndex((index) => index + 1), phaseMs);
    const tick = window.setInterval(() => {
      setRemaining((value) => (value > 1 ? value - 1 : value));
    }, 1000);

    return () => {
      window.clearTimeout(advance);
      window.clearInterval(tick);
    };
  }, [status, stepIndex, sequence]);

  const orbStyle = {
    transform: `scale(${status === 'running' ? currentPhase.scale : 0.7})`,
    transitionDuration: reducedMotion || status !== 'running' ? '0s' : `${currentPhase.seconds}s`,
  } as const;

  return (
    <div className="island-hatchery-card island-run-breathing">
      <p className="island-stop-modal__copy">🧘 <strong>Guided Breathing</strong></p>

      <div className="island-run-breathing__stage" aria-hidden="true">
        <span className={`island-run-breathing__orb island-run-breathing__orb--${currentPhase.key}`} style={orbStyle}>
          <span className="island-run-breathing__orb-inner" />
        </span>
      </div>

      {status === 'idle' ? (
        <>
          <p className="island-run-breathing__hint">
            A one-minute reset: follow the circle through three slow breaths — in, hold, and out.
          </p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={() => {
                setStepIndex(0);
                setStatus('running');
              }}
            >
              🧘 Begin breathing
            </button>
          </div>
        </>
      ) : null}

      {status === 'running' ? (
        <div className="island-run-breathing__guide" aria-live="polite">
          <p className="island-run-breathing__phase">{currentPhase.label}</p>
          <p className="island-run-breathing__count">{remaining}</p>
          <p className="island-run-breathing__cycle">Breath {Math.min(currentCycle, CYCLES)} of {CYCLES}</p>
        </div>
      ) : null}

      {status === 'done' ? (
        <>
          <p className="island-run-breathing__done">Nicely done. Notice how you feel right now.</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={() => onComplete('🧘 Breathing exercise complete! Well done.')}
            >
              Complete stop
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
