import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  BRICK_COLORS,
  BRICK_LAYER_PAUSE_MS,
  BRICKS_PER_LAYER,
  brickLayerState,
  judgeRhythmTap,
  RHYTHM_BEAT_MS,
  stackReleaseLocks,
} from '../services/buildStyles';
import './build-style-pads.css';

type PadProps = {
  disabled: boolean;
  costLabel: string;
  /** One canonical build step; resolves false when nothing was built. */
  onBuild: () => Promise<boolean>;
};

function useStep(onBuild: () => Promise<boolean>) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const step = useCallback(async () => {
    if (inFlight.current) return false;
    inFlight.current = true; setBusy(true);
    try { return await onBuild(); } finally { inFlight.current = false; setBusy(false); }
  }, [onBuild]);
  return { busy, step };
}

/* ── Bricks: LEGO-ASMR, brick by brick with a beat per layer ───────── */
export function BrickBuildPad({ disabled, costLabel, onBuild }: PadProps) {
  const { busy, step } = useStep(onBuild);
  const [placed, setPlaced] = useState(0);
  const [pausing, setPausing] = useState(false);
  const [dropId, setDropId] = useState(0);
  const { layer, inLayer } = brickLayerState(placed);
  const tap = async () => {
    if (disabled || busy || pausing) return;
    const built = await step();
    if (!built) return;
    const next = placed + 1;
    setPlaced(next); setDropId(Date.now());
    try { navigator.vibrate?.(8); } catch { /* unsupported */ }
    if (brickLayerState(next).layerJustCompleted) {
      setPausing(true);
      window.setTimeout(() => setPausing(false), BRICK_LAYER_PAUSE_MS);
    }
  };
  const shownInLayer = pausing ? BRICKS_PER_LAYER : inLayer;
  const shownLayer = pausing ? layer - 1 : layer;
  return (
    <div className={`bsp bsp--bricks${pausing ? ' bsp--layer-done' : ''}`}>
      <button type="button" className="bsp-bricks" disabled={disabled} onClick={() => void tap()}
        aria-label={`Brick by brick: tap to place the next brick for ${costLabel}`}>
        <span className="bsp-bricks__base" aria-hidden="true">
          {Array.from({ length: Math.min(2, Math.max(0, shownLayer)) }, (_, row) => (
            <span key={row} className="bsp-bricks__row bsp-bricks__row--done">
              {Array.from({ length: BRICKS_PER_LAYER }, (_, i) => <i key={i} style={{ background: BRICK_COLORS[(i + row) % BRICK_COLORS.length] }} />)}
            </span>
          ))}
        </span>
        <span className="bsp-bricks__row bsp-bricks__row--live" aria-hidden="true">
          {Array.from({ length: BRICKS_PER_LAYER }, (_, i) => (
            <i key={i}
              className={i < shownInLayer ? `is-placed${i === shownInLayer - 1 && !pausing ? ' is-new' : ''}` : i === shownInLayer ? 'is-next' : ''}
              data-drop={i === shownInLayer - 1 ? dropId : undefined}
              style={i < shownInLayer ? { background: BRICK_COLORS[(i + shownLayer) % BRICK_COLORS.length] } : undefined} />
          ))}
        </span>
        <strong>{pausing ? 'Layer complete!' : busy ? 'Click…' : 'Tap to place'}</strong>
        <small>{costLabel} per brick</small>
      </button>
    </div>
  );
}

/* ── Stack: drag the beam up and lock it in ──────────────────────── */
export function StackBuildPad({ disabled, costLabel, onBuild }: PadProps) {
  const { busy, step } = useStep(onBuild);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; height: number } | null>(null);
  // Release reads the latest drag progress (state would be one render stale,
  // which also made Enter/Space never build).
  const progressRef = useRef(0);
  const [progress, setProgressState] = useState(0);
  const [locked, setLocked] = useState(false);
  const [stacked, setStacked] = useState(0);
  const [nudge, setNudge] = useState(0);
  const setProgress = (value: number) => { progressRef.current = value; setProgressState(value); };
  const down = (event: ReactPointerEvent) => {
    if (disabled || busy || locked || !track.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, height: track.current.getBoundingClientRect().height - 36 };
  };
  const move = (event: ReactPointerEvent) => {
    if (!drag.current) return;
    setProgress(Math.max(0, Math.min(1, (drag.current.startY - event.clientY) / drag.current.height)));
  };
  const up = async () => {
    if (!drag.current) return;
    drag.current = null;
    if (!stackReleaseLocks(progressRef.current)) {
      // A plain tap (or a short drag) teaches the gesture instead of doing nothing.
      if (progressRef.current < 0.5) setNudge((n) => n + 1);
      setProgress(0);
      return;
    }
    setProgress(1); setLocked(true);
    const built = await step();
    try { navigator.vibrate?.(built ? [10, 40, 16] : 6); } catch { /* unsupported */ }
    window.setTimeout(() => { if (built) setStacked((n) => n + 1); setLocked(false); setProgress(0); }, 520);
  };
  return (
    <div className={`bsp bsp--stack${locked ? ' bsp--locked' : ''}`}>
      <div className="bsp-stack__rail">
      <div ref={track} className="bsp-stack__track" aria-hidden="true">
        <span className="bsp-stack__slot" />
        {!locked && progress === 0 ? (
          <span key={nudge} className={`bsp-stack__cue${nudge > 0 ? ' bsp-stack__cue--nudge' : ''}`}>⇡ Drag up past the line</span>
        ) : null}
        <span className="bsp-stack__pile">{Array.from({ length: Math.min(4, stacked) }, (_, i) => <i key={i} />)}</span>
      </div>
      <button type="button" key={`beam-${nudge}`} className={`bsp-stack__beam${nudge > 0 ? ' bsp-stack__beam--nudge' : ''}`} disabled={disabled}
        style={{ bottom: `calc(${progress} * (100% - 36px))` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={() => void up()} onPointerCancel={() => { drag.current = null; setProgress(0); }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setProgress(1); drag.current = { startY: 0, height: 1 }; void up(); } }}
        aria-label={`Hoist and stack: drag the beam up to build one step for ${costLabel}`}>
        ⇡ Hoist
      </button>
      </div>
      <p className="bsp__hint">{locked ? 'Locked in!' : `Drag up past the line · ${costLabel}`}</p>
    </div>
  );
}

/* ── Rhythm: tap as the ring meets the drum ─────────────────────── */
export function RhythmBuildPad({ disabled, costLabel, onBuild }: PadProps) {
  const { busy, step } = useStep(onBuild);
  const start = useRef(performance.now());
  const [feedback, setFeedback] = useState<{ id: number; hit: boolean } | null>(null);
  const [combo, setCombo] = useState(0);
  const tap = async () => {
    if (disabled || busy) return;
    const hit = judgeRhythmTap(performance.now() - start.current) === 'beat';
    setFeedback({ id: Date.now(), hit });
    if (!hit) { setCombo(0); return; }
    const built = await step();
    if (built) { setCombo((c) => c + 1); try { navigator.vibrate?.(10); } catch { /* unsupported */ } }
  };
  return (
    <div className={`bsp bsp--rhythm${combo >= 4 ? ' bsp--groove' : ''}`}>
      <button type="button" className="bsp-drum" disabled={disabled}
        onPointerDown={(event) => { event.preventDefault(); void tap(); }}
        onKeyDown={(event) => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); void tap(); } }}
        aria-label={`Build to the beat: tap as the ring meets the drum for ${costLabel}. Off-beat taps are free.`}>
        <span className="bsp-drum__ring" style={{ animationDuration: `${RHYTHM_BEAT_MS}ms` }} aria-hidden="true" />
        <span className="bsp-drum__skin"><strong>{busy ? '♪' : 'TAP'}</strong><small>{costLabel}</small></span>
        {feedback ? <span key={feedback.id} className={`bsp-drum__fx bsp-drum__fx--${feedback.hit ? 'hit' : 'off'}`}>{feedback.hit ? (combo >= 3 ? `♪ Groove ×${combo + 1}` : '♪ On beat!') : 'Off beat'}</span> : null}
      </button>
      <p className="bsp__hint">Tap as the ring closes · off-beat taps are free</p>
    </div>
  );
}
