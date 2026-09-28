import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  applyLabyrinthMove,
  createLabyrinthRun,
  getLabyrinthBoardRingCells,
  getLabyrinthMoveBudget,
  isLabyrinthHelperAvailable,
  ISLAND_20_LABYRINTH_FLOORS,
  LABYRINTH_HELPER_TRIES,
  readLabyrinthProgress,
  restartLabyrinthFloor,
  scanLabyrinthRoute,
  slideOnLabyrinthFloor,
  writeLabyrinthProgress,
  type LabyrinthCell,
  type LabyrinthDirection,
  type LabyrinthRun,
} from '../services/island20SlideLabyrinth';
import './island20-slide-labyrinth.css';

type Props = {
  progressKey: string;
  onClose: () => void;
};

type Phase = 'play' | 'busy' | 'falling' | 'descending' | 'scanning' | 'finished';

const SLIDE_MS_PER_CELL = 70;
const ARROWS: Record<LabyrinthDirection, string> = { up: '↑', down: '↓', left: '←', right: '→' };

/**
 * Island 020's own mini-game: the Lava Labyrinth. Viewport portal with a
 * backdrop and scroll lock; presentation only (progress lives per viewer).
 */
export function Island20SlideLabyrinth({ progressKey, onClose }: Props) {
  const [run, setRun] = useState<LabyrinthRun>(() => {
    const saved = readLabyrinthProgress(progressKey);
    return createLabyrinthRun(saved.finishedAtMs ? 0 : saved.floorIndex);
  });
  const [phase, setPhase] = useState<Phase>('descending');
  const [impact, setImpact] = useState<{ kind: 'bump' | 'shake'; id: number } | null>(null);
  const [slideMs, setSlideMs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [helperOn, setHelperOn] = useState(false);
  const timers = useRef<number[]>([]);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const floor = ISLAND_20_LABYRINTH_FLOORS[run.floorIndex];

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = previous; };
  }, []);

  // Each floor arrives from above.
  useEffect(() => {
    if (phase !== 'descending') return undefined;
    const timer = window.setTimeout(() => setPhase('play'), 1100);
    return () => window.clearTimeout(timer);
  }, [phase, run.floorIndex]);

  const flashToast = useCallback((text: string) => {
    setToast(text);
    later(1800, () => setToast((current) => (current === text ? null : current)));
  }, [later]);

  const move = useCallback((direction: LabyrinthDirection) => {
    if (phase !== 'play') return;
    const result = applyLabyrinthMove(run, direction);
    if (result.outcome === 'blocked') {
      setImpact((value) => ({ kind: 'shake', id: (value?.id ?? 0) + 1 }));
      return;
    }
    const duration = 80 + result.path.length * SLIDE_MS_PER_CELL;
    setSlideMs(duration);
    if (result.outcome === 'moved') {
      setRun(result.run);
      later(duration, () => setImpact((value) => ({ kind: 'bump', id: (value?.id ?? 0) + 1 })));
      return;
    }
    if (result.outcome === 'out-of-moves') {
      // Slide to where the move ends, then reset to the start.
      setPhase('busy');
      setRun({ ...run, position: result.path[result.path.length - 1] });
      later(duration + 260, () => {
        setPhase('play');
        setSlideMs(0);
        setRun(result.run);
        setHelperOn(false);
        flashToast(`Out of moves: back to the start (try ${result.run.tries})`);
      });
      return;
    }
    // Stopped on the hole: slide in, fall, then the next floor descends.
    setPhase('busy');
    setRun(result.outcome === 'finished' ? result.run : { ...run, position: result.path[result.path.length - 1], moves: run.moves + 1 });
    later(duration, () => setPhase('falling'));
    if (result.outcome === 'finished') {
      writeLabyrinthProgress(progressKey, { floorIndex: run.floorIndex, finishedAtMs: Date.now() });
      later(duration + 700, () => setPhase('finished'));
      return;
    }
    writeLabyrinthProgress(progressKey, { floorIndex: result.run.floorIndex, finishedAtMs: null });
    later(duration + 650, () => {
      setSlideMs(0);
      setHelperOn(false);
      setRun(result.run);
      setPhase('descending');
    });
  }, [flashToast, later, phase, progressKey, run]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      const map: Record<string, LabyrinthDirection> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      const direction = map[event.key];
      if (direction) { event.preventDefault(); move(direction); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, onClose]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const restart = () => {
    if (phase !== 'play') return;
    setSlideMs(0);
    setHelperOn(false);
    setRun((current) => restartLabyrinthFloor(current));
  };

  const callRobot = () => {
    if (!isLabyrinthHelperAvailable(run) || phase !== 'play') return;
    setPhase('scanning');
    later(2100, () => { setHelperOn(true); setPhase('play'); });
  };

  const playAgain = () => {
    writeLabyrinthProgress(progressKey, { floorIndex: 0, finishedAtMs: null });
    setRun(createLabyrinthRun(0));
    setHelperOn(false);
    setPhase('descending');
  };

  // The helper route: slide stops from the current position, numbered.
  const route = useMemo(() => {
    if (!helperOn) return [] as { cell: LabyrinthCell; direction: LabyrinthDirection; step: number }[];
    const directions = scanLabyrinthRoute(run);
    const stops: { cell: LabyrinthCell; direction: LabyrinthDirection; step: number }[] = [];
    let cursor = run.position;
    directions.forEach((direction, index) => {
      stops.push({ cell: cursor, direction, step: index + 1 });
      cursor = slideOnLabyrinthFloor(floor, cursor, direction).to;
    });
    return stops;
  }, [floor, helperOn, run]);

  const ring = useMemo(() => getLabyrinthBoardRingCells(floor), [floor]);
  const cellStyle = (cell: LabyrinthCell) => ({
    '--r': cell.row, '--c': cell.col,
  }) as CSSProperties;
  const budget = getLabyrinthMoveBudget(floor);
  const helperReady = isLabyrinthHelperAvailable(run);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="lava-lab" role="dialog" aria-modal="true" aria-labelledby="lava-lab-title">
      <div className="lava-lab__backdrop" aria-hidden="true" />
      <section className="lava-lab__panel">
        <header className="lava-lab__header">
          <div>
            <small>Island 020 · Lava Labyrinth</small>
            <h2 id="lava-lab-title">Floor {run.floorIndex + 1} of 3 · {floor.name}</h2>
          </div>
          <button type="button" className="lava-lab__close" aria-label="Close labyrinth" onClick={onClose}>×</button>
        </header>

        <div className="lava-lab__stage">
          <ol className="lava-lab__stack" aria-label="Floors">
            {ISLAND_20_LABYRINTH_FLOORS.map((entry, index) => (
              <li
                key={entry.id}
                className={index < run.floorIndex || run.finished ? 'is-cleared' : index === run.floorIndex ? 'is-current' : undefined}
              >
                <span>{index + 1}</span>
              </li>
            ))}
          </ol>

          <div
            className={`lava-lab__board lava-lab__board--${floor.id}${phase === 'descending' ? ' is-descending' : ''}`}
            key={`floor-${run.floorIndex}`}
            style={{ '--n': floor.size } as CSSProperties}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            aria-label={`${floor.name}. Swipe or use the arrows to slide the robot to the ${floor.id === 'lowest' ? 'board vault' : 'hole'}.`}
          >
            {floor.id === 'lowest' ? <span className="lava-lab__ring-glow" aria-hidden="true" /> : null}
            {floor.rows.flatMap((line, row) => line.split('').map((ch, col) => (
              <span
                key={`${row}-${col}`}
                className={ch === '#' ? 'lava-lab__wall' : 'lava-lab__floor'}
                style={cellStyle({ row, col })}
                aria-hidden="true"
              />
            )))}
            {ring.map((cell, index) => (
              <span key={`ring-${cell.row}-${cell.col}`} className={`lava-lab__ring-tile lava-lab__ring-tile--${index % 4}`} style={cellStyle(cell)} aria-hidden="true" />
            ))}
            <span className={`lava-lab__exit${floor.id === 'lowest' ? ' lava-lab__exit--vault' : ''}`} style={cellStyle(floor.exit)} aria-hidden="true" />
            {route.map((stop) => (
              <span key={`route-${stop.step}`} className="lava-lab__route" style={cellStyle(stop.cell)} aria-hidden="true">
                <b>{stop.step}</b>{ARROWS[stop.direction]}
              </span>
            ))}
            <span
              key={`robot-${impact?.id ?? 0}`}
              className={`lava-lab__robot${phase === 'falling' || phase === 'finished' ? ' is-falling' : ''}${impact?.kind === 'shake' ? ' is-shaking' : ''}${impact?.kind === 'bump' ? ' is-bumping' : ''}`}
              style={{ ...cellStyle(run.position), '--slide-ms': `${slideMs}ms` } as CSSProperties}
              aria-label="Robot"
            >
              <i /><i />
            </span>
            {phase === 'scanning' ? (
              <span className="lava-lab__scan" aria-hidden="true">
                <span className="lava-lab__scan-lidar" />
                <span className="lava-lab__scan-sonar" />
                <span className="lava-lab__scan-sonar lava-lab__scan-sonar--late" />
                <span className="lava-lab__scan-laser" />
              </span>
            ) : null}
            {phase === 'descending' ? (
              <span className="lava-lab__floor-banner" aria-hidden="true">
                <small>Floor {run.floorIndex + 1}</small>{floor.name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="lava-lab__hud" role="status" aria-live="polite">
          <span>Moves <b>{run.moves}</b> / {budget}</span>
          <span>Best <b>{floor.par}</b></span>
          <span>Tries <b>{run.tries}</b></span>
        </div>
        {toast ? <p className="lava-lab__toast">{toast}</p> : null}

        <div className="lava-lab__controls">
          <div className="lava-lab__pad" aria-label="Slide direction">
            <button type="button" className="lava-lab__pad-up" aria-label="Slide up" onClick={() => move('up')}>▲</button>
            <button type="button" className="lava-lab__pad-left" aria-label="Slide left" onClick={() => move('left')}>◀</button>
            <button type="button" className="lava-lab__pad-right" aria-label="Slide right" onClick={() => move('right')}>▶</button>
            <button type="button" className="lava-lab__pad-down" aria-label="Slide down" onClick={() => move('down')}>▼</button>
          </div>
          <div className="lava-lab__actions">
            <button type="button" onClick={restart}>↺ Restart floor</button>
            {helperReady ? (
              <button type="button" className="lava-lab__robot-call" onClick={callRobot} disabled={helperOn}>
                🤖 {helperOn ? 'Route scanned' : 'Robot scan'}
              </button>
            ) : (
              <small>Stuck? After {LABYRINTH_HELPER_TRIES} tries the robot can scan the floor ({run.tries}/{LABYRINTH_HELPER_TRIES}).</small>
            )}
          </div>
        </div>

        {phase === 'finished' ? (
          <div className="lava-lab__win">
            <span className="lava-lab__win-icon" aria-hidden="true">🏆</span>
            <h3>You reached the Board Vault!</h3>
            <p>All three floors cleared. The heart of the labyrinth is the island&apos;s own board.</p>
            <div>
              <button type="button" onClick={playAgain}>Play again</button>
              <button type="button" className="lava-lab__win-close" onClick={onClose}>Back to the island</button>
            </div>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
