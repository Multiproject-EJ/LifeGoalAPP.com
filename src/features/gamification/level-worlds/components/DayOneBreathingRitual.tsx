import { useEffect, useMemo, useRef, useState } from 'react';

type BreathStep = {
  key: 'inhale' | 'exhale';
  label: string;
  seconds: number;
  scale: number;
  cycle: number;
};

const BREATHS = 3;
const INHALE_SECONDS = 2;
const EXHALE_SECONDS = 3;
const INHALE_SCALES = [0.92, 1, 1.08] as const;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type DayOneBreathingRitualProps = {
  onRitualComplete: () => Promise<{ ok: boolean; rewardLine?: string; message?: string }>;
  onContinue: () => void;
};

export function DayOneBreathingRitual({
  onRitualComplete,
  onContinue,
}: DayOneBreathingRitualProps) {
  const sequence = useMemo<BreathStep[]>(
    () => Array.from({ length: BREATHS }, (_, index) => [
      {
        key: 'inhale' as const,
        label: 'Breathe in',
        seconds: INHALE_SECONDS,
        scale: INHALE_SCALES[index] ?? 1,
        cycle: index + 1,
      },
      {
        key: 'exhale' as const,
        label: 'Breathe out',
        seconds: EXHALE_SECONDS,
        scale: 0.56,
        cycle: index + 1,
      },
    ]).flat(),
    [],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(sequence[0].seconds);
  const [status, setStatus] = useState<'running' | 'rewarding' | 'bloom' | 'error'>('running');
  const [rewardLine, setRewardLine] = useState('🪷 +1 Lotus Flower');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const completionStartedRef = useRef(false);
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const currentStep = sequence[Math.min(stepIndex, sequence.length - 1)];

  useEffect(() => {
    if (status !== 'running') return undefined;
    if (stepIndex >= sequence.length) {
      if (completionStartedRef.current) return undefined;
      completionStartedRef.current = true;
      setStatus('rewarding');
      void onRitualComplete().then((result) => {
        if (!result.ok) {
          setErrorMessage(result.message ?? 'The breath was completed, but the reward could not be saved.');
          setStatus('error');
          return;
        }
        if (result.rewardLine) setRewardLine(result.rewardLine);
        setStatus('bloom');
      });
      return undefined;
    }

    const step = sequence[stepIndex];
    setRemaining(step.seconds);
    const advanceTimer = window.setTimeout(
      () => setStepIndex((current) => current + 1),
      step.seconds * 1000,
    );
    const tickTimer = window.setInterval(() => {
      setRemaining((current) => Math.max(1, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(advanceTimer);
      window.clearInterval(tickTimer);
    };
  }, [onRitualComplete, sequence, status, stepIndex]);

  const orbStyle = {
    transform: `scale(${status === 'running' ? currentStep.scale : status === 'bloom' ? 1.18 : 0.72})`,
    transitionDuration: reducedMotion || status !== 'running' ? '0s' : `${currentStep.seconds}s`,
  } as const;

  return (
    <div className={`day-one-breath${status === 'bloom' ? ' day-one-breath--bloom' : ''}`}>
      <div className="day-one-breath__flash" aria-hidden="true" />
      <p className="day-one-breath__eyebrow">Routekeeper Steps</p>
      <h3 className="day-one-breath__title">
        {status === 'bloom' ? 'The Routekeeper Steps relight' : 'Three breaths can wake the island'}
      </h3>

      <div className="day-one-breath__stage" aria-hidden="true">
        <span
          className={`day-one-breath__orb day-one-breath__orb--${currentStep.key}`}
          style={orbStyle}
        >
          <span className="day-one-breath__orb-shine" />
          {status === 'bloom' ? (
            <span className="day-one-breath__lotus">
              <span>🪷</span>
              <i />
            </span>
          ) : null}
        </span>
      </div>

      {status === 'running' ? (
        <div className="day-one-breath__guide" aria-live="polite">
          <p className="day-one-breath__phase">{currentStep.label}</p>
          <p className="day-one-breath__count">{remaining}</p>
          <p className="day-one-breath__cycle">Breath {currentStep.cycle} of {BREATHS}</p>
        </div>
      ) : null}

      {status === 'rewarding' ? (
        <p className="day-one-breath__saving" role="status">Letting the island remember…</p>
      ) : null}

      {status === 'error' ? (
        <div className="day-one-breath__result" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--primary" onClick={onContinue}>
            Continue
          </button>
        </div>
      ) : null}

      {status === 'bloom' ? (
        <div className="day-one-breath__result" role="status">
          <strong>{rewardLine}</strong>
          <p>The island has its first light. Your one-breath, seven-day habit is waiting on Today.</p>
          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
            onClick={onContinue}
          >
            Return to the island
          </button>
        </div>
      ) : null}
    </div>
  );
}
