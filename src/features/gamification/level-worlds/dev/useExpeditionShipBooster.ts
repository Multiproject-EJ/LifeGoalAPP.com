import {useCallback, useEffect, useState} from 'react';

export const EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS = 40;
export const EXPEDITION_SHIP_BOOSTER_SUSTAIN_SECONDS = 30;
export const EXPEDITION_SHIP_BOOSTER_DECAY_SECONDS =
  EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS - EXPEDITION_SHIP_BOOSTER_SUSTAIN_SECONDS;

const smoothstep01 = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
};

export function resolveExpeditionShipBoosterLevel(elapsedSeconds: number) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return 0;
  if (elapsedSeconds >= EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS) return 0;
  const ignition = smoothstep01(elapsedSeconds / 0.45);
  if (elapsedSeconds <= EXPEDITION_SHIP_BOOSTER_SUSTAIN_SECONDS) return ignition;
  const decayProgress = (
    elapsedSeconds - EXPEDITION_SHIP_BOOSTER_SUSTAIN_SECONDS
  ) / EXPEDITION_SHIP_BOOSTER_DECAY_SECONDS;
  return ignition * (1 - smoothstep01(decayProgress));
}

/**
 * Presentation-only local timing. This hook deliberately owns no gameplay,
 * economy or persistence state; it only supplies the model's existing visual
 * `boost` input for the forty-second Fast Space demonstration.
 */
export function useExpeditionShipBooster() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (startedAt === null) return undefined;
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = Math.max(0, (now - startedAt) / 1000);
      if (elapsed >= EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS) {
        setElapsedSeconds(EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS);
        setStartedAt(null);
        return;
      }
      setElapsedSeconds(elapsed);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [startedAt]);

  const activate = useCallback(() => {
    setElapsedSeconds(0);
    setStartedAt(performance.now());
  }, []);

  const level = startedAt === null ? 0 : resolveExpeditionShipBoosterLevel(elapsedSeconds);
  const remainingSeconds = startedAt === null
    ? 0
    : Math.max(0, Math.ceil(EXPEDITION_SHIP_BOOSTER_DURATION_SECONDS - elapsedSeconds));

  return {
    activate,
    active: startedAt !== null,
    elapsedSeconds,
    level,
    remainingSeconds,
  };
}
