import { memo } from 'react';
import type { TileAnchor } from '../../services/islandBoardLayout';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';

// ─── SVG icon set replacing emojis ───────────────────────────────────────────
// Inline SVG mini-icons for each tile type.  Sized 18×18 viewBox.

const TILE_SVG_ICONS: Record<string, JSX.Element> = {
  currency: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="#FFD700" stroke="#B8860B" strokeWidth="1.2"/>
      <text x="9" y="12.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#7B5B00">$</text>
    </svg>
  ),
  chest: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="12" height="9" rx="1.5" fill="#C87533" stroke="#8B4513" strokeWidth="1"/>
      <rect x="3" y="6" width="12" height="4" rx="1.5" fill="#DDA15E"/>
      <rect x="7.5" y="8" width="3" height="4" rx="0.8" fill="#FFD700" stroke="#B8860B" strokeWidth="0.5"/>
    </svg>
  ),
  event: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M9 2L11 7H16L12 10.5L13.5 16L9 12.5L4.5 16L6 10.5L2 7H7L9 2Z" fill="#FFE066" stroke="#CCA300" strokeWidth="0.8"/>
    </svg>
  ),
  hazard: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M9 2L16 15H2L9 2Z" fill="#FF6B6B" stroke="#CC0000" strokeWidth="0.8"/>
      <text x="9" y="13" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff">!</text>
    </svg>
  ),
  egg_shard: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M9 2C6 2 4 6 4 10C4 13.3 6.2 16 9 16C11.8 16 14 13.3 14 10C14 6 12 2 9 2Z" fill="#B0E0E6" stroke="#5F9EA0" strokeWidth="0.8"/>
      <path d="M7 8L9 6L11 8L9 10Z" fill="#7EC8E3" opacity="0.7"/>
    </svg>
  ),
  micro: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3" fill="#C8A2FF"/>
      <path d="M9 3L10 7H14L10.5 9.5L12 14L9 11L6 14L7.5 9.5L4 7H8L9 3Z" fill="#DFC0FF" stroke="#9B59B6" strokeWidth="0.5"/>
    </svg>
  ),
  encounter: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M5 3L7 8L3 12H8L6 16" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M10 2L12 7L8 11H13L11 15" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" fill="#00E5FF" stroke="#00ACC1" strokeWidth="1.2"/>
      <rect x="7" y="5" width="4" height="8" rx="1" fill="#fff" opacity="0.9"/>
    </svg>
  ),
};

export interface BoardTileProps {
  anchor: TileAnchor;
  index: number;
  position: { x: number; y: number };
  isStop: boolean;
  tileType: IslandTileMapEntry['tileType'] | undefined;
  isEncounter: boolean;
  isEncounterCompleted: boolean;
  isTokenCurrent: boolean;
  isUpcoming: boolean;
  isSpark60: boolean;
  tileIndex: number;
  showDebug: boolean;
  isMinimalBoardArt: boolean;
}

export const BoardTile = memo(function BoardTile(props: BoardTileProps) {
  const {
    anchor,
    index,
    position,
    isStop,
    tileType,
    isEncounter,
    isEncounterCompleted,
    isTokenCurrent,
    isUpcoming,
    isSpark60,
    showDebug,
    isMinimalBoardArt,
  } = props;

  const tileTypeClass = !isStop && tileType ? `island-tile--${tileType}` : '';
  const wedgeClipPath = isSpark60
    ? 'polygon(calc(50% - 36px) 0%, calc(50% + 36px) 0%, calc(50% + 52px) 100%, calc(50% - 52px) 100%)'
    : undefined;

  // Choose icon
  let iconContent: JSX.Element | string;
  if (isEncounterCompleted) {
    // Distinct "completed" check icon for finished encounters
    iconContent = (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="7" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1.2"/>
        <path d="M5.5 9.5L8 12L12.5 6.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  } else if (isEncounter) {
    iconContent = TILE_SVG_ICONS.encounter;
  } else if (!isStop && tileType && TILE_SVG_ICONS[tileType]) {
    iconContent = TILE_SVG_ICONS[tileType];
  } else {
    iconContent = <>{index + 1}</>;
  }

  return (
    <div
      className={[
        'island-tile',
        `island-tile--${anchor.zBand}`,
        isStop ? 'island-tile--stop' : '',
        isEncounter ? 'island-tile--encounter' : '',
        isEncounterCompleted ? 'island-tile--encounter-completed' : '',
        tileTypeClass,
        isTokenCurrent ? 'island-tile--token-current' : '',
        isUpcoming ? 'island-tile--upcoming' : '',
        !isMinimalBoardArt ? 'island-tile--alive' : '',
      ].filter(Boolean).join(' ')}
      style={{
        left: position.x,
        top: position.y,
        ['--tile-rotation-deg' as string]: `${isSpark60 ? anchor.tangentDeg + 180 : 0}deg`,
        ['--tile-index' as string]: String(index),
        ['--tile-scale' as string]: String(anchor.scale),
        transform: `translate(-50%, -50%) rotate(var(--tile-rotation-deg)) scale(${anchor.scale})`,
        ...(isSpark60 ? { width: '104px', height: '52px', clipPath: wedgeClipPath } : {}),
      }}
    >
      {!isMinimalBoardArt && <span className="island-tile__shine" aria-hidden="true" />}

      <span className="island-tile__value">
        {iconContent}
      </span>

      {/* Tile number badge */}
      <span className="island-tile__badge" aria-hidden="true">{index + 1}</span>

      {/* Completed overlay */}
      {isEncounterCompleted && (
        <span className="island-tile__completed-badge" aria-hidden="true">✓</span>
      )}

      {showDebug && <small className="island-tile__anchor-id">{anchor.id}</small>}
    </div>
  );
});
