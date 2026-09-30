import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import {
  DEPARTURE_DAY_DURATION,
  DEPARTURE_DAY_REDUCED_MOTION_STILLS,
  DEPARTURE_DAY_REDUCED_MOTION_STILL_MS,
  isDepartureDayReady,
  resolveDepartureDayFrame,
} from '../services/islandRunDepartureDay';
import {
  PLAYER_PIECES,
  isPlayerPieceOwned,
  normalizePlayerPieceId,
  type PlayerPieceId,
} from '../services/islandRunPlayerPieces';
import { startIslandRunCrowdAmbience, triggerIslandRunHaptic } from '../services/islandRunAudio';
import type { DepartureDayHangar, DepartureDayQuality } from '../dev/DepartureDayHangarThree';
import { PlayerPieceIcon } from './PlayerPieceIcon';
import './DepartureDayScene.css';

type Phase = 'picker' | 'waiting' | 'playing' | 'done';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface DepartureDaySceneProps {
  shipName: string;
  initialPieceId: string | null;
  entitledPieceIds?: readonly string[];
  quality?: DepartureDayQuality;
  /** Replays can be skipped at once; the first viewing plays in full. */
  skippable: boolean;
  /** Canonical write (`selectPlayerPiece`); called once on confirm. */
  onChoosePiece: (pieceId: PlayerPieceId) => void;
  onComplete: () => void;
  /** Dev preview: start at this time (seconds) and hold, without the picker. */
  previewTimeSeconds?: number | null;
}

/**
 * Departure Day: the pre-Island-001 garage send-off. The piece picker opens
 * over the dim hangar while the heavy scene (ship, crowd, crew) loads behind
 * it; confirming plays the ~15 s film and hands off to the Island 001
 * briefing. Viewport portal, fixed backdrop, page scroll locked.
 */
export function DepartureDayScene({
  shipName,
  initialPieceId,
  entitledPieceIds = [],
  quality = 'high',
  skippable,
  onChoosePiece,
  onComplete,
  previewTimeSeconds = null,
}: DepartureDaySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hangarRef = useRef<DepartureDayHangar | null>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>(previewTimeSeconds !== null ? 'playing' : 'picker');
  const [pieceId, setPieceId] = useState<PlayerPieceId>(() => normalizePlayerPieceId(initialPieceId));
  const [caption, setCaption] = useState<string | null>(null);
  const playStartRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reducedMotion = useRef(prefersReducedMotion()).current;

  useEffect(() => lockPageScroll(['body', 'documentElement']), []);

  // Build the hangar in the background as soon as the picker opens.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let cancelled = false;
    let hangar: DepartureDayHangar | null = null;
    void import('../dev/DepartureDayHangarThree')
      .then(async ({ createDepartureDayHangar }) => {
        if (cancelled) return;
        hangar = createDepartureDayHangar({ canvas, shipName, pieceId, quality });
        await hangar.prepare((value) => { if (!cancelled) setProgress(value); });
        if (cancelled) { hangar.dispose(); return; }
        hangarRef.current = hangar;
        hangar.render(previewTimeSeconds ?? 0, 0, true);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    const onResize = () => hangarRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      hangarRef.current = null;
      hangar?.dispose();
    };
    // The hangar is built once; piece changes go through setPiece.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hangar = hangarRef.current;
    if (!hangar) return;
    hangar.setPiece(pieceId);
    if (phase === 'picker' || phase === 'waiting') hangar.render(0, 0, true);
  }, [pieceId, phase, progress]);

  // A failed 3D load must never trap the first run.
  useEffect(() => {
    if (failed && (phase === 'waiting' || phase === 'playing')) onCompleteRef.current();
  }, [failed, phase]);

  useEffect(() => {
    if (phase === 'waiting' && isDepartureDayReady(progress)) setPhase('playing');
  }, [phase, progress]);

  // The film.
  useEffect(() => {
    if (phase !== 'playing' || !isDepartureDayReady(progress)) return undefined;
    const hangar = hangarRef.current;
    if (!hangar) return undefined;
    if (previewTimeSeconds !== null) {
      hangar.render(previewTimeSeconds, 0, reducedMotion);
      // Dev capture hook: render any moment of the film without reloading.
      const devWindow = window as unknown as { __departureDayRender?: (t: number) => void };
      devWindow.__departureDayRender = (t: number) => hangar.render(t, 1 / 30, false);
      return () => { delete devWindow.__departureDayRender; };
    }
    let raf = 0;
    let last = performance.now();
    let liftBuzzed = false;
    let lastCaption: string | null = null;
    const crowd = reducedMotion ? null : startIslandRunCrowdAmbience();
    playStartRef.current = performance.now();
    const finish = () => {
      crowd?.stop();
      setPhase('done');
      onCompleteRef.current();
    };
    if (reducedMotion) {
      // Four held stills with crossfades.
      let index = 0;
      const showStill = () => {
        if (index >= DEPARTURE_DAY_REDUCED_MOTION_STILLS.length) { finish(); return; }
        hangar.render(DEPARTURE_DAY_REDUCED_MOTION_STILLS[index]!, 0, true);
        setCaption(captionFor(DEPARTURE_DAY_REDUCED_MOTION_STILLS[index]!, shipName));
        index += 1;
        raf = window.setTimeout(showStill, DEPARTURE_DAY_REDUCED_MOTION_STILL_MS) as unknown as number;
      };
      showStill();
      return () => { window.clearTimeout(raf); crowd?.stop(); };
    }
    const tick = (now: number) => {
      const t = (now - (playStartRef.current ?? now)) / 1000;
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      hangar.render(t, delta, false);
      const frame = resolveDepartureDayFrame(t);
      crowd?.setEnergy(frame.crowd * (1 - frame.handoff));
      if (!liftBuzzed && frame.liftOff > 0.05) { liftBuzzed = true; triggerIslandRunHaptic('island_travel'); }
      const nextCaption = captionFor(t, shipName);
      if (nextCaption !== lastCaption) { lastCaption = nextCaption; setCaption(nextCaption); }
      if (t >= DEPARTURE_DAY_DURATION) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); crowd?.stop(); };
  }, [phase, progress, previewTimeSeconds, reducedMotion, shipName]);

  const confirm = () => {
    onChoosePiece(pieceId);
    setPhase(isDepartureDayReady(progress) ? 'playing' : 'waiting');
  };

  if (typeof document === 'undefined') return null;
  const ready = isDepartureDayReady(progress);
  const ownedPieces = PLAYER_PIECES.filter((piece) => isPlayerPieceOwned(piece.id, entitledPieceIds));
  const lockedPieces = PLAYER_PIECES.filter((piece) => !isPlayerPieceOwned(piece.id, entitledPieceIds));
  return createPortal(
    <div className="island-run-overlay-root departure-day" data-phase={phase}>
      <canvas ref={canvasRef} className="departure-day__canvas" aria-hidden="true" />
      {!ready && !failed ? <div className="departure-day__veil" aria-hidden="true" /> : null}
      {phase === 'playing' && caption ? (
        <p key={caption} className="departure-day__caption" role="status" aria-live="polite">{caption}</p>
      ) : null}
      {phase === 'playing' && skippable ? (
        <button type="button" className="departure-day__skip" onClick={() => { setPhase('done'); onCompleteRef.current(); }}>
          Skip
        </button>
      ) : null}

      {phase === 'picker' || phase === 'waiting' ? (
        <section className="departure-day__picker" role="dialog" aria-modal="true" aria-labelledby="departure-day-picker-title">
          <p className="departure-day__eyebrow">Departure day · Hangar 01</p>
          <h2 id="departure-day-picker-title">Choose the piece you carry aboard</h2>
          <p className="departure-day__lede">
            You join the crew of <strong>{shipName}</strong> today. Your piece marks you on every island board.
          </p>
          <ul className="departure-day__pieces">
            {ownedPieces.map((piece) => {
              const selected = piece.id === pieceId;
              return (
                <li key={piece.id}>
                  <button
                    type="button"
                    className={`departure-day__piece${selected ? ' is-selected' : ''}`}
                    style={{ '--piece-accent': piece.accentColor } as CSSProperties}
                    disabled={phase === 'waiting'}
                    aria-pressed={selected}
                    onClick={() => setPieceId(piece.id)}
                  >
                    <PlayerPieceIcon pieceId={piece.id} />
                    <strong>{piece.name}</strong>
                    <small>{piece.description}</small>
                  </button>
                </li>
              );
            })}
          </ul>
          {lockedPieces.length > 0 ? (
            <div className="departure-day__locked">
              <span>Earned on the journey</span>
              <ul>
                {lockedPieces.map((piece) => (
                  <li key={piece.id} title={`${piece.name}: ${piece.unlockHint ?? ''}`}>
                    <PlayerPieceIcon pieceId={piece.id} locked />
                    <span className="departure-day__sr">{piece.name}. {piece.unlockHint}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button type="button" className="departure-day__confirm" onClick={confirm} disabled={phase === 'waiting'}>
            {phase === 'waiting' ? (
              <span className="departure-day__preparing">
                Preparing the hangar…
                <i style={{ transform: `scaleX(${Math.max(0.05, progress)})` }} />
              </span>
            ) : 'Board with the crew'}
          </button>
        </section>
      ) : null}
    </div>,
    document.body,
  );
}

function captionFor(t: number, shipName: string): string | null {
  if (t < 2) return 'Departure day. The whole garage came to see you off.';
  if (t < 6) return `${shipName} opens up for the crowd.`;
  if (t < 9.5) return 'The crew and their robots walk out. You walk with them.';
  if (t < 11.5) return 'All aboard for the diplomatic mission.';
  if (t < 14.2) return 'Next stop: the first island.';
  return null;
}
