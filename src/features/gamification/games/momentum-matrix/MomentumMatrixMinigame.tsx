import { useCallback, useMemo, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  MOMENTUM_MATRIX_GRID_SIZE,
  MOMENTUM_MATRIX_RUN_TICKET_COST,
  getMomentumMatrixPlacementCells,
  getMomentumMatrixShape,
  type MomentumMatrixMissionDirection,
  type MomentumMatrixPlacementResult,
  type MomentumMatrixProgressEntry,
} from '../../level-worlds/services/momentumMatrixGame';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../level-worlds/services/islandRunAudio';
import { buildMinigameHudReward, buildMinigameHudTickets } from '../../level-worlds/services/minigameHudContract';
import { MinigameFxOverlay, type MinigameFxHandle } from '../_shared/MinigameFxOverlay';
import { MinigameHudStrip } from '../_shared/MinigameHudStrip';
import './momentumMatrix.css';

type MomentumMatrixLaunchConfig = {
  activeEventId?: string;
  initialProgress?: MomentumMatrixProgressEntry | null;
  getTicketsRemaining?: () => number;
  requestStartRun?: (missionDirection: MomentumMatrixMissionDirection) => {
    ok: boolean;
    resumed: boolean;
    ticketsRemaining: number;
    progress: MomentumMatrixProgressEntry;
    failureReason?: string;
  };
  requestPlacement?: (trayIndex: number, row: number, column: number) => {
    ok: boolean;
    ticketsRemaining: number;
    progress: MomentumMatrixProgressEntry | null;
    placement: MomentumMatrixPlacementResult | null;
    failureReason?: string;
  };
};

const ROUTE_LABELS = {
  focus: 'Focus',
  energy: 'Energy',
  reset: 'Reset',
} as const;

const CLEAR_PALETTE = ['#67e8f9', '#c084fc', '#fda4af', '#fde68a'];
const BEACON_PALETTE = ['#fef3c7', '#fbbf24', '#ffffff'];

function PiecePreview({
  shapeId,
  routeKind,
}: {
  shapeId: string;
  routeKind: string;
}) {
  const shape = getMomentumMatrixShape(shapeId);
  if (!shape) return null;
  const rows = Math.max(...shape.cells.map(([row]) => row)) + 1;
  const columns = Math.max(...shape.cells.map(([, column]) => column)) + 1;
  const occupied = new Set(shape.cells.map(([row, column]) => `${row}:${column}`));
  return (
    <span
      className="momentum-matrix__piece-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      aria-hidden="true"
    >
      {Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        return (
          <i
            key={`${row}:${column}`}
            className={occupied.has(`${row}:${column}`) ? `is-filled is-${routeKind}` : ''}
          />
        );
      })}
    </span>
  );
}

export default function MomentumMatrixMinigame({
  onComplete,
  launchConfig,
}: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as MomentumMatrixLaunchConfig;
  const initialProgress = config.initialProgress ?? null;
  const initialRun = initialProgress?.activeRun ?? null;
  const [progress, setProgress] = useState<MomentumMatrixProgressEntry | null>(initialProgress);
  const [ticketsRemaining, setTicketsRemaining] = useState(
    () => Math.max(0, Math.floor(config.getTicketsRemaining?.() ?? 0)),
  );
  const [phase, setPhase] = useState<'briefing' | 'playing' | 'results'>(
    initialRun?.status === 'active' ? 'playing' : initialRun?.status === 'game_over' ? 'results' : 'briefing',
  );
  const [selectedTrayIndex, setSelectedTrayIndex] = useState<number | null>(null);
  const [previewAnchor, setPreviewAnchor] = useState<number | null>(null);
  const [placedFxCells, setPlacedFxCells] = useState<number[]>([]);
  const [clearedFxCells, setClearedFxCells] = useState<number[]>([]);
  const [scoreToast, setScoreToast] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const fxRef = useRef<MinigameFxHandle | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const run = progress?.activeRun ?? null;
  const selectedPiece = selectedTrayIndex === null ? null : run?.tray[selectedTrayIndex] ?? null;
  const selectedShape = selectedPiece ? getMomentumMatrixShape(selectedPiece.shapeId) : null;
  const previewCells = useMemo(() => {
    if (previewAnchor === null || !selectedShape) return [];
    const row = Math.floor(previewAnchor / MOMENTUM_MATRIX_GRID_SIZE);
    const column = previewAnchor % MOMENTUM_MATRIX_GRID_SIZE;
    return getMomentumMatrixPlacementCells(selectedShape, row, column) ?? [];
  }, [previewAnchor, selectedShape]);
  const previewValid = Boolean(
    run
    && previewCells.length > 0
    && previewCells.every((cellIndex) => run.board[cellIndex] === null),
  );

  const burstAtCells = useCallback((cellIndexes: readonly number[], palette: readonly string[], strength = 1) => {
    const fx = fxRef.current;
    const grid = gridRef.current;
    if (!fx || !grid || cellIndexes.length === 0) return;
    const rect = grid.getBoundingClientRect();
    const cellSize = rect.width / MOMENTUM_MATRIX_GRID_SIZE;
    cellIndexes.slice(0, 12).forEach((cellIndex) => {
      const row = Math.floor(cellIndex / MOMENTUM_MATRIX_GRID_SIZE);
      const column = cellIndex % MOMENTUM_MATRIX_GRID_SIZE;
      const point = fx.toLocalPoint(
        rect.left + ((column + 0.5) * cellSize),
        rect.top + ((row + 0.5) * cellSize),
      );
      if (point) {
        fx.burst({
          x: point.x,
          y: point.y,
          palette,
          count: Math.floor(7 * strength),
          speed: 110 * strength,
          radius: 2.2,
          lifeMs: 620,
        });
      }
    });
  }, []);

  const startRun = (missionDirection: MomentumMatrixMissionDirection) => {
    if (starting) return;
    setStarting(true);
    setMessage(null);
    const result = config.requestStartRun?.(missionDirection);
    setStarting(false);
    if (!result?.ok) {
      setMessage(result?.failureReason === 'insufficient_tickets'
        ? 'One Arena ticket starts a course. Earn another ticket from the reward channel.'
        : 'The navigation link could not open. Your current progress is safe.');
      playIslandRunSound('market_insufficient_coins');
      return;
    }
    setProgress(result.progress);
    setTicketsRemaining(result.ticketsRemaining);
    setSelectedTrayIndex(null);
    setPhase(result.progress.activeRun?.status === 'game_over' ? 'results' : 'playing');
    playIslandRunSound('minigame_open');
    triggerIslandRunHaptic('roll');
  };

  const placeAt = (cellIndex: number) => {
    if (!run || selectedTrayIndex === null || !selectedShape) {
      setMessage('Choose a route fragment below, then tap its top-left destination.');
      return;
    }
    const row = Math.floor(cellIndex / MOMENTUM_MATRIX_GRID_SIZE);
    const column = cellIndex % MOMENTUM_MATRIX_GRID_SIZE;
    const result = config.requestPlacement?.(selectedTrayIndex, row, column);
    if (!result?.ok || !result.progress?.activeRun || !result.placement) {
      setMessage(result?.failureReason === 'occupied' || result?.failureReason === 'out_of_bounds'
        ? 'That fragment cannot stabilize there. Try another open route.'
        : 'The course did not update. Your saved route is unchanged.');
      playIslandRunSound('market_insufficient_coins');
      triggerIslandRunHaptic('stop_land');
      return;
    }
    const placement = result.placement;
    setProgress(result.progress);
    setTicketsRemaining(result.ticketsRemaining);
    setPlacedFxCells(placement.placedCellIndexes);
    setClearedFxCells(placement.clearedCellIndexes);
    setScoreToast(`+${placement.scoreGained}`);
    setMessage(
      placement.beaconAligned
        ? 'Mission Beacon aligned — direction locked.'
        : placement.completedRows.length + placement.completedColumns.length > 0
          ? `${placement.completedRows.length + placement.completedColumns.length} stable corridor${placement.completedRows.length + placement.completedColumns.length === 1 ? '' : 's'}.`
          : null,
    );
    burstAtCells(placement.placedCellIndexes, CLEAR_PALETTE, 0.8);
    if (placement.clearedCellIndexes.length > 0) {
      window.setTimeout(() => burstAtCells(placement.clearedCellIndexes, CLEAR_PALETTE, 1.4), 90);
      fxRef.current?.shake(placement.beaconAligned ? 6 : 3.5, 320);
      playIslandRunSound('sticker_complete');
      triggerIslandRunHaptic('sticker_complete');
    } else {
      playIslandRunSound('token_move');
      triggerIslandRunHaptic('roll');
    }
    if (placement.beaconAligned) {
      window.setTimeout(() => burstAtCells([placement.run.beaconIndex], BEACON_PALETTE, 1.8), 160);
    }
    window.setTimeout(() => {
      setPlacedFxCells([]);
      setClearedFxCells([]);
      setScoreToast(null);
    }, 720);
    setSelectedTrayIndex(null);
    setPreviewAnchor(null);
    if (placement.gameOver) setPhase('results');
  };

  if (phase === 'briefing') {
    return (
      <main className="momentum-matrix momentum-matrix--briefing">
        <MinigameFxOverlay ref={fxRef} />
        <button className="momentum-matrix__close" type="button" onClick={() => onComplete({ completed: false })} aria-label="Close Momentum Matrix">×</button>
        <div className="momentum-matrix__hero-frame">
          <img
            src="/assets/event-games/momentum-matrix/momentum-matrix-hero.webp"
            alt="A glowing spaceship navigation matrix with colourful route fragments and a gold mission beacon"
          />
          <span className="momentum-matrix__hero-scan" aria-hidden="true" />
        </div>
        <section className="momentum-matrix__briefing-copy">
          <p className="momentum-matrix__eyebrow">Shipboard navigation · Arena exhibition</p>
          <h1>Momentum Matrix</h1>
          <p>Place route fragments. Complete rows or columns to stabilize corridors. Cross the gold Mission Beacon to multiply your diplomatic score.</p>
          <div className="momentum-matrix__ticket-note">
            <span>🎟️ {ticketsRemaining}</span>
            <small>{MOMENTUM_MATRIX_RUN_TICKET_COST} ticket starts a course · closing mid-run saves it</small>
          </div>
          <p className="momentum-matrix__direction-label">Choose what today’s momentum should serve:</p>
          <div className="momentum-matrix__directions">
            {(['focus', 'energy', 'reset'] as const).map((direction) => (
              <button
                type="button"
                key={direction}
                onClick={() => startRun(direction)}
                disabled={starting || ticketsRemaining < MOMENTUM_MATRIX_RUN_TICKET_COST}
              >
                <span aria-hidden="true">{direction === 'focus' ? '✦' : direction === 'energy' ? '↗' : '◌'}</span>
                {ROUTE_LABELS[direction]}
              </button>
            ))}
          </div>
          {message ? <p className="momentum-matrix__message" role="status">{message}</p> : null}
        </section>
      </main>
    );
  }

  if (!run) {
    return (
      <main className="momentum-matrix momentum-matrix--briefing">
        <p className="momentum-matrix__message">No saved course was found.</p>
        <button type="button" className="momentum-matrix__primary" onClick={() => setPhase('briefing')}>Return to briefing</button>
      </main>
    );
  }

  if (phase === 'results') {
    return (
      <main className="momentum-matrix momentum-matrix--results">
        <MinigameFxOverlay ref={fxRef} />
        <div className="momentum-matrix__result-orbit" aria-hidden="true"><span>✦</span><i /><i /><i /></div>
        <p className="momentum-matrix__eyebrow">Route energy transmitted</p>
        <h1>{run.score >= 1800 ? 'Brilliant course.' : run.score >= 800 ? 'Course stabilized.' : 'Signal received.'}</h1>
        <p className="momentum-matrix__result-score">{run.score.toLocaleString()}</p>
        <p className="momentum-matrix__result-label">Diplomatic performance</p>
        <div className="momentum-matrix__result-stats">
          <span><strong>{run.corridorsStabilized}</strong> corridors</span>
          <span><strong>{run.beaconsAligned}</strong> beacons</span>
          <span><strong>x{Math.max(1, run.bestCombo)}</strong> best chain</span>
        </div>
        <p className="momentum-matrix__league-note">This route energy joins your Arena record. Adventure League rank still follows your Combined Journey score.</p>
        <button
          type="button"
          className="momentum-matrix__primary"
          onClick={() => onComplete({ completed: true })}
        >
          Complete Arena report
        </button>
        <button type="button" className="momentum-matrix__secondary" onClick={() => startRun(run.missionDirection)} disabled={ticketsRemaining < 1}>
          New course · 1 🎟️
        </button>
      </main>
    );
  }

  return (
    <main className="momentum-matrix momentum-matrix--playing">
      <MinigameFxOverlay ref={fxRef} />
      <header className="momentum-matrix__top">
        <button className="momentum-matrix__close" type="button" onClick={() => onComplete({ completed: false })} aria-label="Save and close Momentum Matrix">×</button>
        <div>
          <p className="momentum-matrix__eyebrow">Chart the Course · {ROUTE_LABELS[run.missionDirection]}</p>
          <h1>Momentum Matrix</h1>
        </div>
        <strong className="momentum-matrix__score-chip">{run.score.toLocaleString()} ✦</strong>
      </header>
      <MinigameHudStrip
        hud={{
          tickets: buildMinigameHudTickets({
            count: ticketsRemaining,
            noun: 'Arena tickets',
          }),
          reward: buildMinigameHudReward({
            points: run.corridorsStabilized,
            milestones: [
              { pointsRequired: 3, rewardLabel: 'Reward channel pulse', claimed: run.corridorsStabilized >= 3, icon: '✦' },
              { pointsRequired: 8, rewardLabel: 'League route boost', claimed: run.corridorsStabilized >= 8, icon: '↗' },
              { pointsRequired: 15, rewardLabel: 'Navigator crest', claimed: run.corridorsStabilized >= 15, icon: '🏅' },
            ],
            remainingUnit: 'corridors',
          }),
        }}
      />
      <section className="momentum-matrix__mission">
        <span className="momentum-matrix__mission-beacon" aria-hidden="true">✦</span>
        <div>
          <strong>Mission Beacon</strong>
          <small>Complete a corridor through its gold cell for +250.</small>
        </div>
      </section>
      <div className="momentum-matrix__grid-shell">
        <span className="momentum-matrix__grid-scan" aria-hidden="true" />
        {scoreToast ? <strong className="momentum-matrix__score-toast">{scoreToast}</strong> : null}
        <div
          className="momentum-matrix__grid"
          ref={gridRef}
          role="grid"
          aria-label="8 by 8 Momentum Matrix"
          onPointerLeave={() => setPreviewAnchor(null)}
        >
          {run.board.map((cell, cellIndex) => {
            const isBeacon = cellIndex === run.beaconIndex;
            const isPreview = previewCells.includes(cellIndex);
            const classNames = [
              'momentum-matrix__cell',
              cell ? `is-${cell}` : '',
              isBeacon ? 'is-mission-beacon' : '',
              isPreview ? (previewValid ? `is-preview is-${selectedPiece?.routeKind ?? 'focus'}` : 'is-preview-invalid') : '',
              placedFxCells.includes(cellIndex) ? 'is-placed' : '',
              clearedFxCells.includes(cellIndex) ? 'is-clearing' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                type="button"
                role="gridcell"
                className={classNames}
                key={cellIndex}
                onPointerEnter={() => setPreviewAnchor(cellIndex)}
                onFocus={() => setPreviewAnchor(cellIndex)}
                onClick={() => placeAt(cellIndex)}
                aria-label={`Row ${Math.floor(cellIndex / MOMENTUM_MATRIX_GRID_SIZE) + 1}, column ${(cellIndex % MOMENTUM_MATRIX_GRID_SIZE) + 1}${cell ? `, ${cell} route` : ', open'}${isBeacon ? ', Mission Beacon' : ''}`}
              >
                {isBeacon ? <span aria-hidden="true">✦</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <p className="momentum-matrix__helper" role="status">
        {message ?? (selectedPiece ? `Place ${getMomentumMatrixShape(selectedPiece.shapeId)?.label ?? 'fragment'} on an open cell.` : 'Choose one route fragment.')}
      </p>
      <div className="momentum-matrix__tray" aria-label="Route fragment tray">
        {run.tray.map((piece, index) => (
          <button
            type="button"
            key={piece?.pieceId ?? `used-${index}`}
            className={selectedTrayIndex === index ? 'is-selected' : ''}
            disabled={!piece}
            onClick={() => {
              setSelectedTrayIndex(index);
              setMessage(null);
            }}
            aria-label={piece ? `Select ${getMomentumMatrixShape(piece.shapeId)?.label ?? 'route fragment'}` : 'Used route fragment'}
          >
            {piece ? <PiecePreview shapeId={piece.shapeId} routeKind={piece.routeKind} /> : <span className="momentum-matrix__used">Linked</span>}
          </button>
        ))}
      </div>
      <p className="momentum-matrix__save-note">Course auto-saved · close safely anytime</p>
    </main>
  );
}
