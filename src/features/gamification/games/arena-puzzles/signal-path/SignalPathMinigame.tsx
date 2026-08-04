import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArenaPerformance, IslandRunMinigameProps } from '../../../level-worlds/services/islandRunMinigameTypes';
import {
  SIGNAL_PATH_GRID_SIZE,
  SIGNAL_PATH_PUZZLES,
  isSignalPathStepValid,
  resolveArenaMastery,
  selectPuzzleByIsland,
} from '../../../level-worlds/services/arenaPuzzleGames';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../../level-worlds/services/islandRunAudio';
import { ArenaPuzzleFrame, ArenaPuzzleResult, useArenaPuzzleClock } from '../_shared/ArenaPuzzleFrame';
import './signalPath.css';

type Phase = 'briefing' | 'playing' | 'results';

export default function SignalPathMinigame({ islandNumber, launchConfig, onComplete }: IslandRunMinigameProps) {
  const puzzle = useMemo(() => selectPuzzleByIsland(SIGNAL_PATH_PUZZLES, islandNumber), [islandNumber]);
  const sessionSeconds = typeof launchConfig?.arenaSessionSeconds === 'number'
    ? Math.max(15, Math.floor(launchConfig.arenaSessionSeconds))
    : null;
  const markerByCell = useMemo(() => new Map(
    puzzle.markerSteps.map((step, index) => [puzzle.path[step]!, index + 1]),
  ), [puzzle]);
  const [phase, setPhase] = useState<Phase>('briefing');
  const [route, setRoute] = useState<number[]>([]);
  const routeRef = useRef<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedCell, setHintedCell] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [performance, setPerformance] = useState<ArenaPerformance | null>(null);
  const draggingRef = useRef(false);

  const setRouteSafe = (next: number[]) => {
    routeRef.current = next;
    setRoute(next);
  };

  const finish = (elapsedSeconds: number, routeLength = routeRef.current.length) => {
    const normalized = resolveArenaMastery({
      completionRatio: routeLength / (SIGNAL_PATH_GRID_SIZE ** 2),
      mistakes,
      hints: hintsUsed,
      elapsedSeconds,
      parSeconds: 55,
    });
    setPerformance({
      gameId: 'signal_path',
      rawScore: (routeLength * 45) - (mistakes * 25) - (hintsUsed * 40),
      mastery: normalized.mastery,
      stars: normalized.stars,
      durationMs: elapsedSeconds * 1000,
      mistakes,
      hintsUsed,
    });
    setPhase('results');
    playIslandRunSound('sticker_complete');
    triggerIslandRunHaptic('sticker_complete');
  };

  const clock = useArenaPuzzleClock({
    active: phase === 'playing',
    sessionSeconds,
    onExpire: () => finish(sessionSeconds ?? 0),
  });

  useEffect(() => {
    const stopDrag = () => { draggingRef.current = false; };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, []);

  if (phase === 'results' && performance) {
    return (
      <ArenaPuzzleResult
        icon="⌁"
        title={route.length === SIGNAL_PATH_GRID_SIZE ** 2 ? 'Signal path complete' : 'Route window closed'}
        performance={performance}
        summary={`${route.length} of ${SIGNAL_PATH_GRID_SIZE ** 2} cells connected through ${puzzle.title}.`}
        detail="A complete route fills every cell and reaches each numbered beacon in order."
        onContinue={() => onComplete({ completed: true, arenaPerformance: performance })}
      />
    );
  }

  if (phase === 'briefing') {
    return (
      <ArenaPuzzleFrame
        className="signal-path"
        icon="⌁"
        eyebrow="Caretaker route trial"
        title="Signal Path"
        progress="5 beacons"
        remainingSeconds={sessionSeconds}
        onClose={() => onComplete({ completed: false })}
      >
        <section className="arena-puzzle__brief">
          <strong>One path. Every cell. Beacons in order.</strong>
          <span>Start at 1, drag or tap through neighbouring cells, and finish at 5 without crossing your route.</span>
        </section>
        <div className="signal-path__preview" aria-hidden="true">
          <span>1</span><i /><i /><span>2</span><i /><i /><span>3</span><i /><span>4</span><i /><span>5</span>
        </div>
        <div className="signal-path__tips">
          <span>↔ Move only up, down, left or right</span>
          <span>↩ Backtrack by touching the previous cell</span>
          <span>◇ Fill the entire grid before reaching the final beacon</span>
        </div>
        <button type="button" className="arena-puzzle__primary" onClick={() => setPhase('playing')}>Light the first beacon</button>
      </ArenaPuzzleFrame>
    );
  }

  const highestMarkerReached = route.reduce((highest, cell) => Math.max(highest, markerByCell.get(cell) ?? 0), 0);

  const enterCell = (cell: number) => {
    const current = routeRef.current;
    const last = current[current.length - 1];
    if (current.length === 0) {
      if (cell !== puzzle.path[0]) {
        setMistakes((value) => value + 1);
        setMessage('Begin at beacon 1.');
        triggerIslandRunHaptic('stop_land');
        return;
      }
      setRouteSafe([cell]);
      setMessage('Signal acquired. Continue to beacon 2.');
      playIslandRunSound('token_move');
      return;
    }
    if (cell === last) return;
    if (current.length > 1 && cell === current[current.length - 2]) {
      setRouteSafe(current.slice(0, -1));
      setHintedCell(null);
      return;
    }
    if (current.includes(cell) || last === undefined || !isSignalPathStepValid(last, cell)) {
      if (!draggingRef.current) setMessage('The path cannot cross itself or jump between cells.');
      return;
    }
    const marker = markerByCell.get(cell);
    const nextMarker = current.reduce((highest, routeCell) => Math.max(highest, markerByCell.get(routeCell) ?? 0), 0) + 1;
    if (marker === puzzle.markerSteps.length && current.length !== (SIGNAL_PATH_GRID_SIZE ** 2) - 1) {
      setMistakes((value) => value + 1);
      setMessage('The final beacon closes the route. Fill every other cell first.');
      playIslandRunSound('market_insufficient_coins');
      triggerIslandRunHaptic('stop_land');
      return;
    }
    if (marker !== undefined && marker !== nextMarker) {
      setMistakes((value) => value + 1);
      setMessage(`Reach beacon ${nextMarker} before beacon ${marker}.`);
      playIslandRunSound('market_insufficient_coins');
      triggerIslandRunHaptic('stop_land');
      return;
    }
    const next = [...current, cell];
    setRouteSafe(next);
    setHintedCell(null);
    if (marker) {
      setMessage(marker === puzzle.markerSteps.length ? 'Final beacon reached.' : `Beacon ${marker} linked.`);
      playIslandRunSound('sticker_complete');
    } else {
      setMessage(null);
      playIslandRunSound('token_move');
    }
    if (next.length === SIGNAL_PATH_GRID_SIZE ** 2 && marker === puzzle.markerSteps.length) {
      window.setTimeout(() => finish(clock.elapsedSeconds, next.length), 420);
    }
  };

  const revealHint = () => {
    if (hintsUsed >= 3) return;
    const current = routeRef.current;
    const followsCanonical = current.every((cell, index) => puzzle.path[index] === cell);
    if (!followsCanonical) {
      setMessage('Backtrack until your route rejoins the softly glowing chart.');
      setHintedCell(puzzle.path[Math.max(0, current.length - 1)] ?? null);
    } else {
      setHintedCell(puzzle.path[current.length] ?? null);
      setMessage('The next safe cell is glowing.');
    }
    setHintsUsed((value) => value + 1);
    playIslandRunSound('minigame_open');
  };

  return (
    <ArenaPuzzleFrame
      className="signal-path"
      icon="⌁"
      eyebrow="Caretaker route trial"
      title="Signal Path"
      progress={`${route.length}/25 cells`}
      remainingSeconds={clock.remainingSeconds}
      onClose={() => onComplete({ completed: false })}
      message={message}
    >
      <section className="arena-puzzle__brief signal-path__mission">
        <strong>{puzzle.title}</strong>
        <span>Next target: beacon {Math.min(puzzle.markerSteps.length, highestMarkerReached + 1)}</span>
      </section>
      <div
        className="signal-path__grid"
        role="grid"
        aria-label="Five by five signal route grid"
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-signal-cell]');
          const value = target?.dataset.signalCell;
          if (value !== undefined) enterCell(Number(value));
        }}
      >
        {Array.from({ length: SIGNAL_PATH_GRID_SIZE ** 2 }, (_, cell) => {
          const routeIndex = route.indexOf(cell);
          const marker = markerByCell.get(cell);
          return (
            <button
              type="button"
              role="gridcell"
              key={cell}
              data-signal-cell={cell}
              className={`${routeIndex >= 0 ? 'is-routed' : ''}${routeIndex === route.length - 1 ? ' is-head' : ''}${hintedCell === cell ? ' is-hinted' : ''}${marker ? ' is-beacon' : ''}`}
              onPointerDown={(event) => {
                event.preventDefault();
                draggingRef.current = true;
                enterCell(cell);
              }}
              onPointerEnter={() => { if (draggingRef.current) enterCell(cell); }}
              onClick={() => enterCell(cell)}
              aria-label={`${marker ? `Beacon ${marker}` : `Cell ${cell + 1}`}${routeIndex >= 0 ? `, route step ${routeIndex + 1}` : ''}`}
            >
              {marker ? <strong>{marker}</strong> : null}
              {routeIndex >= 0 ? <i style={{ '--route-order': routeIndex } as React.CSSProperties} /> : null}
            </button>
          );
        })}
      </div>
      <div className="signal-path__actions">
        <button type="button" className="arena-puzzle__secondary" onClick={() => { setRouteSafe([]); setMessage('Route cleared. Begin again at beacon 1.'); }}>Reset</button>
        <button type="button" className="arena-puzzle__secondary" onClick={revealHint} disabled={hintsUsed >= 3}>Hint {3 - hintsUsed}/3</button>
      </div>
    </ArenaPuzzleFrame>
  );
}
