import { useEffect, useRef, useState } from 'react';
import {
  FISHING_CAST_GOOD_MIN,
  FISHING_CAST_MIN_SWIPE_SPEED,
  FISHING_CAST_OVERSWING,
  FISHING_CAST_PERFECT_HALF_WIDTH,
  FISHING_CAST_SWEET_SPOT,
  fishingAssistedCastPowerAt,
  fishingCastLabel,
  fishingCastPowerAt,
  judgeFishingCast,
  type FishingCastJudgement,
} from '../services/fishingCastSkill';
import './fishing-cast-meter.css';

type Props = {
  /** Mercy cast: calm needle that cannot overswing. */
  assisted: boolean;
  onThrow: (judgement: FishingCastJudgement) => void;
};

const pct = (value: number) => `${(value / 1.12) * 100}%`;

/**
 * Swipe up fast (or tap CAST) to throw. The needle climbs toward the gold
 * sweet spot and shakes harder the closer it gets — wait too long and the rod
 * overswings into the ground; throw too early and the cast falls short.
 */
export function FishingCastMeter({ assisted, onThrow }: Props) {
  const needleRef = useRef<HTMLSpanElement>(null);
  const startedAt = useRef(performance.now());
  const seed = useRef(Math.random() * 10);
  const swipe = useRef<{ y: number; t: number } | null>(null);
  const [result, setResult] = useState<FishingCastJudgement | null>(null);

  const powerNow = () => {
    const elapsed = performance.now() - startedAt.current;
    return assisted ? fishingAssistedCastPowerAt(elapsed) : fishingCastPowerAt(elapsed, seed.current);
  };

  useEffect(() => {
    if (result) return undefined;
    let frame = 0;
    const tick = () => {
      if (needleRef.current) needleRef.current.style.bottom = pct(powerNow());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, assisted]);

  const throwNow = () => {
    if (result) return;
    const judgement = judgeFishingCast(powerNow(), assisted);
    setResult(judgement);
    window.setTimeout(() => onThrow(judgement), 850);
  };

  return (
    <div
      className={`fishing-cast${assisted ? ' fishing-cast--assisted' : ''}${result ? ` fishing-cast--${result}` : ''}`}
      onPointerDown={(event) => { swipe.current = { y: event.clientY, t: performance.now() }; }}
      onPointerUp={(event) => {
        const start = swipe.current; swipe.current = null;
        if (!start) return;
        const dy = start.y - event.clientY;
        const speed = dy / Math.max(1, performance.now() - start.t);
        if (dy > 40 && speed >= FISHING_CAST_MIN_SWIPE_SPEED) throwNow();
      }}
    >
      <div className="fishing-cast__meter" aria-hidden="true">
        <i className="fishing-cast__zone fishing-cast__zone--ground" style={{ bottom: pct(FISHING_CAST_OVERSWING), top: 0 }} />
        <i className="fishing-cast__zone fishing-cast__zone--good" style={{ bottom: pct(FISHING_CAST_GOOD_MIN), height: `calc(${pct(FISHING_CAST_OVERSWING)} - ${pct(FISHING_CAST_GOOD_MIN)})` }} />
        <i className="fishing-cast__zone fishing-cast__zone--perfect" style={{ bottom: pct(FISHING_CAST_SWEET_SPOT - FISHING_CAST_PERFECT_HALF_WIDTH), height: pct(FISHING_CAST_PERFECT_HALF_WIDTH * 2) }} />
        <span ref={needleRef} className="fishing-cast__needle" />
      </div>
      <div className="fishing-cast__side">
        {result ? (
          <strong className="fishing-cast__result" role="status">{fishingCastLabel(result)}</strong>
        ) : (
          <>
            <span className="fishing-cast__swipe" aria-hidden="true">⇡</span>
            <p>{assisted ? 'Steady hands — this cast is a sure thing' : 'Swipe up fast to cast in the green. Too long and it overswings!'}</p>
            <button type="button" className="fishing-cast__button" onClick={throwNow}>CAST</button>
          </>
        )}
      </div>
    </div>
  );
}
