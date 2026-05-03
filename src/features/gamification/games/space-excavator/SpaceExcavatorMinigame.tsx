import { useEffect, useMemo, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import './spaceExcavator.css';

type Tile = { dug: boolean; treasure: boolean };

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
  const size = 5;
  const treasureCount = Math.max(3, Math.min(8, 3 + Math.floor(islandNumber / 8)));
  const toolBudgetFromLaunch = typeof launchConfig?.toolBudget === 'number' ? Math.floor(launchConfig.toolBudget) : null;
  const initialTools = Math.max(10, toolBudgetFromLaunch ?? 14);

  const [tiles, setTiles] = useState<Tile[]>(() => makeBoard(size, treasureCount));
  const [tools, setTools] = useState(initialTools);
  const [finished, setFinished] = useState(false);
  const [sentResult, setSentResult] = useState(false);

  const found = useMemo(() => tiles.filter((t) => t.dug && t.treasure).length, [tiles]);
  const won = found >= treasureCount;

  const sendOnce = (completed: boolean) => {
    if (sentResult) return;
    setSentResult(true);
    setFinished(true);
    onComplete({ completed, reward: completed ? { dice: 1 } : undefined });
  };

  const onDig = (index: number) => {
    if (finished || tools <= 0 || won) return;
    setTiles((prev) => {
      if (prev[index]?.dug) return prev;
      const next = [...prev];
      next[index] = { ...next[index], dug: true };
      return next;
    });
    setTools((t) => t - 1);
  };

  useEffect(() => {
    if (!finished && won) sendOnce(true);
    if (!finished && tools <= 0 && !won) sendOnce(false);
  }, [finished, won, tools]);

  return (
    <section className="space-excavator" aria-label="Space Excavator">
      <div className="space-excavator__hud">
        <span>Island {islandNumber}</span>
        <span>Tools: {tools}</span>
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

      <div className="space-excavator__actions">
        <button type="button" className="space-excavator__button" onClick={() => sendOnce(false)} disabled={finished}>Close</button>
        <button
          type="button"
          className="space-excavator__button"
          onClick={() => {
            setTiles(makeBoard(size, treasureCount));
            setTools(initialTools);
            setFinished(false);
            setSentResult(false);
          }}
        >
          Restart
        </button>
      </div>
    </section>
  );
}
