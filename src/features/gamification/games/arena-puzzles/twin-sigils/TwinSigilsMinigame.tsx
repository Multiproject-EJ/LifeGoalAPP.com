import { useMemo, useState } from 'react';
import type { ArenaPerformance, IslandRunMinigameProps } from '../../../level-worlds/services/islandRunMinigameTypes';
import {
  TWIN_SIGIL_PUZZLES,
  resolveArenaMastery,
  selectPuzzleForSession,
  validateTwinSigilBoard,
  type TwinSigilValue,
} from '../../../level-worlds/services/arenaPuzzleGames';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../../level-worlds/services/islandRunAudio';
import { ArenaPuzzleFrame, ArenaPuzzleResult, useArenaPuzzleClock } from '../_shared/ArenaPuzzleFrame';
import './twinSigils.css';

type Phase = 'briefing' | 'playing' | 'results';

export default function TwinSigilsMinigame({ islandNumber, launchConfig, onComplete }: IslandRunMinigameProps) {
  const puzzleSeed = typeof launchConfig?.arenaPuzzleSeed === 'string' ? launchConfig.arenaPuzzleSeed : `${islandNumber}:sigils`;
  const puzzle = useMemo(() => selectPuzzleForSession(TWIN_SIGIL_PUZZLES, islandNumber, puzzleSeed), [islandNumber, puzzleSeed]);
  const sessionSeconds = typeof launchConfig?.arenaSessionSeconds === 'number'
    ? Math.max(15, Math.floor(launchConfig.arenaSessionSeconds))
    : null;
  const initialBoard = useMemo(() => Array.from({ length: puzzle.size ** 2 }, (_, index) => (
    puzzle.givens[index] ?? null
  )), [puzzle]);
  const [phase, setPhase] = useState<Phase>('briefing');
  const [board, setBoard] = useState<(TwinSigilValue | null)[]>(initialBoard);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedCell, setHintedCell] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [performance, setPerformance] = useState<ArenaPerformance | null>(null);
  const validation = useMemo(() => validateTwinSigilBoard(board, puzzle.size), [board, puzzle.size]);
  const filled = board.filter((value) => value !== null).length;
  const playerCells = puzzle.size ** 2 - Object.keys(puzzle.givens).length;
  const playerFilled = Math.max(0, filled - Object.keys(puzzle.givens).length);

  const finish = (elapsedSeconds: number, completionRatio = playerFilled / playerCells) => {
    const normalized = resolveArenaMastery({
      completionRatio,
      mistakes,
      hints: hintsUsed,
      elapsedSeconds,
      parSeconds: 115,
    });
    setPerformance({
      gameId: 'twin_sigils',
      rawScore: Math.round(completionRatio * 1800) - (mistakes * 40) - (hintsUsed * 70),
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

  if (phase === 'results' && performance) {
    return (
      <ArenaPuzzleResult
        icon="◐"
        title={validation.valid ? 'Perfect equilibrium' : 'Balance recorded'}
        performance={performance}
        summary={`${playerFilled} of ${playerCells} open sigils resolved.`}
        detail="No row or column may contain three matching sigils or more than three of either kind."
        onContinue={() => onComplete({ completed: true, arenaPerformance: performance })}
      />
    );
  }

  if (phase === 'briefing') {
    return (
      <ArenaPuzzleFrame
        className="twin-sigils"
        icon="◐"
        eyebrow="Dual-signal logic trial"
        title="Twin Sigils"
        progress="6 × 6 grid"
        remainingSeconds={sessionSeconds}
        onClose={() => onComplete({ completed: false })}
      >
        <section className="arena-puzzle__brief">
          <strong>Balance light and shadow.</strong>
          <span>Complete the grid using only the two caretaker sigils. Every row and column follows the same laws.</span>
        </section>
        <div className="twin-sigils__preview" aria-hidden="true"><span>✦</span><i>◐</i><span>✦</span><i>◐</i></div>
        <div className="twin-sigils__rules">
          <div><b>3 + 3</b><span>Three light and three shadow sigils in every line.</span></div>
          <div><b>No 3</b><span>Never place three matching sigils beside one another.</span></div>
          <div><b>Unique</b><span>No two finished rows or columns may be identical.</span></div>
        </div>
        <button type="button" className="arena-puzzle__primary" onClick={() => setPhase('playing')}>Enter the balance chamber</button>
      </ArenaPuzzleFrame>
    );
  }

  const cycleCell = (cell: number) => {
    if (puzzle.givens[cell] !== undefined) return;
    setBoard((current) => {
      const next = [...current];
      next[cell] = current[cell] === null ? 1 : current[cell] === 1 ? 0 : null;
      return next;
    });
    setHintedCell(null);
    setMessage(null);
    playIslandRunSound('token_move');
  };

  const checkBoard = () => {
    if (!validation.complete) {
      setMessage('Every chamber needs a sigil before the balance can be tested.');
      return;
    }
    if (!validation.valid) {
      setMistakes((value) => value + 1);
      setMessage('The glowing row or column breaks a balance law.');
      playIslandRunSound('market_insufficient_coins');
      triggerIslandRunHaptic('stop_land');
      return;
    }
    setMessage('The chamber is in perfect equilibrium.');
    window.setTimeout(() => finish(clock.elapsedSeconds, 1), 520);
  };

  const revealHint = () => {
    if (hintsUsed >= 3) return;
    const cell = board.findIndex((value) => value === null);
    if (cell < 0) return;
    setBoard((current) => {
      const next = [...current];
      next[cell] = puzzle.solution[cell]!;
      return next;
    });
    setHintedCell(cell);
    setHintsUsed((value) => value + 1);
    setMessage('Central Command stabilized one chamber.');
    playIslandRunSound('minigame_open');
  };

  return (
    <ArenaPuzzleFrame
      className="twin-sigils"
      icon="◐"
      eyebrow="Dual-signal logic trial"
      title="Twin Sigils"
      progress={`${playerFilled}/${playerCells} placed`}
      remainingSeconds={clock.remainingSeconds}
      onClose={() => onComplete({ completed: false })}
      message={message}
    >
      <section className="arena-puzzle__brief twin-sigils__mission">
        <strong>Tap to cycle</strong>
        <span>Empty → Light ✦ → Shadow ◐</span>
      </section>
      <div className="twin-sigils__grid-shell">
        <div className="twin-sigils__grid" role="grid" aria-label="Six by six Twin Sigils logic grid">
          {board.map((value, cell) => {
            const row = Math.floor(cell / puzzle.size);
            const column = cell % puzzle.size;
            const given = puzzle.givens[cell] !== undefined;
            const invalid = validation.invalidRows.includes(row) || validation.invalidColumns.includes(column);
            return (
              <button
                type="button"
                role="gridcell"
                key={cell}
                className={`${value === 1 ? 'is-light' : value === 0 ? 'is-shadow' : ''}${given ? ' is-given' : ''}${invalid ? ' is-invalid' : ''}${hintedCell === cell ? ' is-hinted' : ''}`}
                onClick={() => cycleCell(cell)}
                aria-label={`Row ${row + 1}, column ${column + 1}${value === 1 ? ', light sigil' : value === 0 ? ', shadow sigil' : ', empty'}${given ? ', fixed' : ''}`}
              >
                {value === 1 ? <span aria-hidden="true">✦</span> : value === 0 ? <span aria-hidden="true">◐</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="twin-sigils__legend"><span><i className="is-light">✦</i> Light</span><span><i className="is-shadow">◐</i> Shadow</span></div>
      <div className="twin-sigils__actions">
        <button type="button" className="arena-puzzle__secondary" onClick={revealHint} disabled={hintsUsed >= 3}>Hint {3 - hintsUsed}/3</button>
        <button type="button" className="arena-puzzle__primary" onClick={checkBoard}>Test balance</button>
      </div>
    </ArenaPuzzleFrame>
  );
}
