import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { ISLAND_BOARD_SIGNATURE_SYMBOLS, ISLAND_BOARD_TILE_LEGEND } from '../services/islandBoardTileLegend';
import { getBoardTileGlyph } from './board/BoardTile';

export interface IslandBoardSymbolLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IslandBoardSymbolLegendModal({ isOpen, onClose }: IslandBoardSymbolLegendModalProps): React.JSX.Element | null {
  const titleId = React.useId();
  const closeRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const unlockScroll = lockPageScroll();
    const timer = window.setTimeout(() => closeRef.current?.focus(), 100);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="island-board-symbol-legend" role="presentation">
      <section className="island-board-symbol-legend__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div>
            <p>Compass field guide</p>
            <h2 id={titleId}>Board symbols</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close board-symbol guide">×</button>
        </header>

        <p className="island-board-symbol-legend__intro">The symbol tells you what a tile does. Its material stays quiet so rewards and mission objects remain easy to see.</p>

        <div className="island-board-symbol-legend__grid">
          {ISLAND_BOARD_TILE_LEGEND.map((entry) => (
            <article key={entry.tileType}>
              <span className={`island-board-symbol-legend__tile island-tile--${entry.tileType}`} aria-hidden="true">
                {getBoardTileGlyph(entry.tileType)}
              </span>
              <span>
                <strong>{entry.label}</strong>
                <small>{entry.description}</small>
              </span>
            </article>
          ))}
        </div>

        <div className="island-board-symbol-legend__missions">
          <p>Island-specific marks</p>
          {ISLAND_BOARD_SIGNATURE_SYMBOLS.map((entry) => (
            <span key={entry.label}>
              <b aria-hidden="true">{entry.symbol}</b>
              <span><strong>{entry.label}</strong><small>{entry.description}</small></span>
            </span>
          ))}
        </div>

        <button type="button" className="island-board-symbol-legend__done" onClick={onClose}>Back to the board</button>
      </section>
    </div>,
    document.body,
  );
}
