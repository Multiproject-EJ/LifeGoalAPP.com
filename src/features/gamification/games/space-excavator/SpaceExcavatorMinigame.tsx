import { useEffect, useMemo, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import './spaceExcavator.css';

type Tile = { dug: boolean; treasure: boolean };

type DigSpendResult = { ok: boolean; ticketsRemaining: number };

type SpaceExcavatorLaunchConfig = {
  requestDigSpend?: (tileId: number) => DigSpendResult;
  getTicketsRemaining?: () => number;
};

function makeBoard(size: number, treasureCount: number): Tile[] {
  const tiles = Array.from({ length: size * size }, () => ({ dug: false, treasure: false }));
  const placed = new Set<number>();
  while (placed.size < treasureCount && placed.size < tiles.length) {
    placed.add(Math.floor(Math.random() * tiles.length));
  }
  for (const i of placed) tiles[i].treasure = true;
  return tiles;
}

export function SpaceExcavatorMinigame({ onComplete, islandNumber, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as SpaceExcavatorLaunchConfig;
  const size = 5;
  const treasureCount = Math.max(3, Math.min(8, 3 + Math.floor(islandNumber / 8)));

  const [tiles, setTiles] = useState<Tile[]>(() => makeBoard(size, treasureCount));
  const [ticketsRemaining, setTicketsRemaining] = useState<number>(() => Math.max(0, Math.floor(config.getTicketsRemaining?.() ?? 0)));
  const [finished, setFinished] = useState(false);
  const [sentResult, setSentResult] = useState(false);
  const [showOutOfTickets, setShowOutOfTickets] = useState(false);

  const found = useMemo(() => tiles.filter((t) => t.dug && t.treasure).length, [tiles]);
  const won = found >= treasureCount;

  const sendOnce = (completed: boolean) => {
    if (sentResult) return;
    setSentResult(true);
    setFinished(true);
    onComplete({ completed });
  };

  const onDig = (index: number) => {
    if (finished || won) return;
    if (tiles[index]?.dug) return;

    const spend = config.requestDigSpend?.(index) ?? { ok: false, ticketsRemaining };
    setTicketsRemaining(spend.ticketsRemaining);

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

  useEffect(() => {
    if (!finished && won) sendOnce(true);
  }, [finished, won]);

  return (
    <section className="space-excavator" aria-label="Space Excavator">
      <div className="space-excavator__hud">
        <span>Island {islandNumber}</span>
        <span>Tickets: {ticketsRemaining}</span>
        <span>Found: {found}/{treasureCount}</span>
      </div>

      <div className="space-excavator__board" style={{ gridTemplateColumns: `repeat(${size}, 44px)` }}>
        {tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            className={`space-excavator__tile ${tile.dug ? (tile.treasure ? 'space-excavator__tile--treasure' : 'space-excavator__tile--dug') : ''}`}
            onClick={() => onDig(i)}
            disabled={finished || tile.dug}
            aria-label={`Tile ${i + 1}`}
          >
            {tile.dug ? (tile.treasure ? '💎' : '·') : '⬛'}
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

      <div className="space-excavator__actions">
        <button type="button" className="space-excavator__button" onClick={() => sendOnce(false)} disabled={finished}>Close</button>
      </div>
    </section>
  );
}
