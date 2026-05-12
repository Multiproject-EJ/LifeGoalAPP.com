import { useMemo, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import './spaceExcavator.css';

type Tile = { dug: boolean; objectPiece: boolean };

type SpaceExcavatorProgressStatus = 'active' | 'board_complete' | 'completed';
type SpaceExcavatorProgress = {
  boardIndex: number;
  completedBoardCount: number;
  boardSize: number;
  treasureCount: number;
  treasureTileIds: number[];
  objectId?: string;
  objectName?: string;
  objectIcon?: string;
  objectTileIds?: number[];
  revealedObjectTileIds?: number[];
  dugTileIds: number[];
  foundTreasureTileIds: number[];
  status: SpaceExcavatorProgressStatus;
};
type DigSpendResult = { ok: boolean; ticketsRemaining: number; progress?: SpaceExcavatorProgress | null; boardComplete?: boolean; canAdvanceBoard?: boolean };
type AdvanceBoardResult = { ok: boolean; ticketsRemaining: number; progress?: SpaceExcavatorProgress | null };

type SpaceExcavatorLaunchConfig = {
  requestDigSpend?: (tileId: number) => DigSpendResult;
  requestAdvanceBoard?: () => AdvanceBoardResult;
  getTicketsRemaining?: () => number;
  initialProgress?: SpaceExcavatorProgress | null;
  totalBoards?: number;
};

function makeBoard(size: number, treasureCount: number): Tile[] {
  const tiles = Array.from({ length: size * size }, () => ({ dug: false, objectPiece: false }));
  const placed = new Set<number>();
  while (placed.size < treasureCount && placed.size < tiles.length) {
    placed.add(Math.floor(Math.random() * tiles.length));
  }
  for (const i of placed) tiles[i].objectPiece = true;
  return tiles;
}

export function SpaceExcavatorMinigame({ onComplete, islandNumber, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as SpaceExcavatorLaunchConfig;
  const initial = config.initialProgress;
  const totalBoards = Math.max(1, Math.floor(config.totalBoards ?? 10));
  const [progress, setProgress] = useState<SpaceExcavatorProgress | null>(initial ?? null);
  const size = Math.max(1, Math.floor(progress?.boardSize ?? initial?.boardSize ?? 5));
  const objectTileIds = progress?.objectTileIds ?? initial?.objectTileIds ?? progress?.treasureTileIds ?? initial?.treasureTileIds ?? [];
  const objectPieceCount = Math.max(1, Math.floor(objectTileIds.length || progress?.treasureCount || initial?.treasureCount || Math.max(3, Math.min(8, 3 + Math.floor(islandNumber / 8)))));

  const [tiles, setTiles] = useState<Tile[]>(() => {
    if (!initial) return makeBoard(size, objectPieceCount);
    const initialObjectTileIds = initial.objectTileIds ?? initial.treasureTileIds;
    return Array.from({ length: size * size }, (_, i) => ({ dug: initial.dugTileIds.includes(i), objectPiece: initialObjectTileIds.includes(i) }));
  });
  const [ticketsRemaining, setTicketsRemaining] = useState<number>(() => Math.max(0, Math.floor(config.getTicketsRemaining?.() ?? 0)));
  const [finished, setFinished] = useState(false);
  const [sentResult, setSentResult] = useState(false);
  const [showOutOfTickets, setShowOutOfTickets] = useState(false);

  const syncProgress = (nextProgress: SpaceExcavatorProgress) => {
    setProgress(nextProgress);
    const nextObjectTileIds = nextProgress.objectTileIds ?? nextProgress.treasureTileIds;
    setTiles(Array.from({ length: nextProgress.boardSize * nextProgress.boardSize }, (_, i) => ({ dug: nextProgress.dugTileIds.includes(i), objectPiece: nextObjectTileIds.includes(i) })));
  };

  const found = useMemo(() => tiles.filter((t) => t.dug && t.objectPiece).length, [tiles]);
  const progressStatus = progress?.status ?? 'active';
  const boardComplete = progressStatus === 'board_complete' || progressStatus === 'completed';
  const canAdvanceBoard = progressStatus === 'board_complete';
  const boardLabel = `Board ${Math.max(1, Math.floor((progress?.boardIndex ?? 0) + 1))}${totalBoards > 1 ? ` / ${totalBoards}` : ''}`;

  const sendOnce = (completed: boolean) => {
    if (sentResult) return;
    setSentResult(true);
    setFinished(true);
    onComplete({ completed });
  };

  const onDig = (index: number) => {
    if (finished || boardComplete) return;
    if (tiles[index]?.dug) return;

    const spend = config.requestDigSpend?.(index) ?? { ok: false, ticketsRemaining };
    setTicketsRemaining(spend.ticketsRemaining);

    if (spend.ok && spend.progress) {
      syncProgress(spend.progress);
      return;
    }
    if (!spend.ok) {
      setShowOutOfTickets(true);
      return;
    }

    setTiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], dug: true };
      return next;
    });
  };

  const onAdvanceBoard = () => {
    const advance = config.requestAdvanceBoard?.() ?? { ok: false, ticketsRemaining };
    setTicketsRemaining(advance.ticketsRemaining);
    if (advance.ok && advance.progress) {
      syncProgress(advance.progress);
    }
  };

  return (
    <section className="space-excavator" aria-label="Space Excavator">
      <div className="space-excavator__hud">
        <span>Island {islandNumber}</span>
        <span>{boardLabel}</span>
        <span>Tickets: {ticketsRemaining}</span>
        <span>Pieces found: {found}/{objectPieceCount}</span>
      </div>

      <div className="space-excavator__preview" aria-label="Hidden object preview">
        <div className="space-excavator__silhouette" aria-hidden="true">
          {progress?.objectIcon ?? initial?.objectIcon ?? '❔'}
        </div>
        <div>
          <p className="space-excavator__preview-title">Find: {progress?.objectName ?? initial?.objectName ?? 'Hidden Relic'}</p>
          <p className="space-excavator__preview-progress">{found} / {objectPieceCount} pieces found</p>
          <div className="space-excavator__progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.round((found / objectPieceCount) * 100))}%` }} />
          </div>
        </div>
      </div>

      <div className="space-excavator__board" style={{ gridTemplateColumns: `repeat(${size}, 44px)` }}>
        {tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            className={`space-excavator__tile ${tile.dug ? (tile.objectPiece ? 'space-excavator__tile--object' : 'space-excavator__tile--dug') : ''}`}
            onClick={() => onDig(i)}
            disabled={finished || boardComplete || tile.dug}
            aria-label={`Tile ${i + 1}`}
          >
            {tile.dug ? (tile.objectPiece ? (progress?.objectIcon ?? initial?.objectIcon ?? '✦') : '·') : '⬛'}
          </button>
        ))}
      </div>

      {showOutOfTickets && (
        <div className="space-excavator__notice" role="status" aria-live="polite">
          <p><strong>Out of Space Excavator tickets</strong></p>
          <p>Earn more from the Island Run reward bar, then come back and keep digging.</p>
          <div className="space-excavator__actions">
            <button type="button" className="space-excavator__button" onClick={() => sendOnce(false)}>Back to Island Run</button>
            <button type="button" className="space-excavator__button" onClick={() => setShowOutOfTickets(false)}>Keep looking</button>
          </div>
        </div>
      )}

      {boardComplete && (
        <div className="space-excavator__notice space-excavator__notice--success" role="status" aria-live="polite">
          <p><strong>{progressStatus === 'completed' ? 'All boards cleared' : 'Board cleared'}</strong></p>
          <p>{progress?.objectName ?? initial?.objectName ?? 'Hidden Relic'} found {found}/{objectPieceCount}.</p>
          {canAdvanceBoard && (
            <div className="space-excavator__actions">
              <button type="button" className="space-excavator__button" onClick={onAdvanceBoard}>Continue to next board</button>
            </div>
          )}
        </div>
      )}

      <div className="space-excavator__actions">
        <button type="button" className="space-excavator__button" onClick={() => sendOnce(false)} disabled={finished}>Close</button>
      </div>
    </section>
  );
}
