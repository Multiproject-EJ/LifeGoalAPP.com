import { GameBoardOverlay } from './GameBoardOverlay';
import '../styles/game-board-overlay.css';

/** Development-only preview of the Two Tracks overlay. Never reads or writes player data. */
export default function GameBoardOverlayPreview() {
  const params = new URLSearchParams(window.location.search);
  const island = Number.parseInt(params.get('island') ?? '4', 10) || 4;
  const log = (what: string) => () => console.info(`[overlay preview] ${what}`);
  return (
    <GameBoardOverlay
      isOpen
      onClose={log('close')}
      onPlayClick={log('play')}
      onTopbarClick={log('today')}
      onActionsClick={log('actions')}
      onCreatureCollectionClick={log('breathe')}
      onSpinWinClick={log('score')}
      onGarageClick={log('garage')}
      onCompassClick={log('menu')}
      islandNumber={island}
      islandDisplayName={`Island ${String(island).padStart(3, '0')}`}
      essenceBalance={1240}
      spotlightPlay={params.get('spotlight') === '1'}
    />
  );
}
