import { memo } from 'react';
import type { TileAnchor } from '../../services/islandBoardLayout';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';
import type { VisibleTechnologyFragment } from '../../services/islandTechnologyFragmentVisuals';

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
      <path d="M9 2L16 15H2L9 2Z" fill="#D76A52" stroke="#A5392A" strokeWidth="0.8"/>
      <text x="9" y="13" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff">!</text>
    </svg>
  ),
  micro: (
    // Small reward → soft gold sparkle (sits on the pearl-marble micro tile)
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3" fill="#E8C25E"/>
      <path d="M9 3L10 7H14L10.5 9.5L12 14L9 11L6 14L7.5 9.5L4 7H8L9 3Z" fill="#FBE8A6" stroke="#C99A33" strokeWidth="0.5"/>
    </svg>
  ),
  encounter: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M5 3L7 8L3 12H8L6 16" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M10 2L12 7L8 11H13L11 15" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  card: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="5" y="2.5" width="9" height="12" rx="1.6" fill="#7C3AED" stroke="#F5D0FE" strokeWidth="1" transform="rotate(8 9.5 8.5)"/>
      <rect x="3.5" y="3.5" width="9" height="12" rx="1.6" fill="#FDE68A" stroke="#A16207" strokeWidth="1"/>
      <path d="M8 6L9 8.2L11.4 8.5L9.7 10.1L10.1 12.4L8 11.2L5.9 12.4L6.3 10.1L4.6 8.5L7 8.2L8 6Z" fill="#7C3AED"/>
    </svg>
  ),
  landmark_door: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M5 3.5H13V15H5V3.5Z" fill="#7C3AED" stroke="#F5D0FE" strokeWidth="1"/>
      <path d="M7 5H12V15H7V5Z" fill="#C084FC" opacity="0.85"/>
      <circle cx="11" cy="10" r="0.8" fill="#FFF7AD"/>
    </svg>
  ),
  build_discount: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="12" height="10" rx="2" fill="#22C55E" stroke="#064E3B" strokeWidth="1"/>
      <text x="9" y="11.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="#ECFDF5">25%</text>
    </svg>
  ),
  free_ticket: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H14v2a2 2 0 0 0 0 4v2H4.5A1.5 1.5 0 0 1 3 11.5V10a1 1 0 0 0 0-2V6.5Z" fill="#F97316" stroke="#7C2D12" strokeWidth="1"/>
      <text x="8.5" y="11" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#FFF7ED">T</text>
    </svg>
  ),
  traffic_light: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="8" height="14" rx="2" fill="#102A1D" stroke="#BBF7D0" strokeWidth="1"/>
      <circle cx="9" cy="5.2" r="1.45" fill="#EF4444"/>
      <circle cx="9" cy="9" r="1.45" fill="#FACC15"/>
      <circle cx="9" cy="12.8" r="1.45" fill="#22C55E"/>
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
  doorStopId?: IslandTileMapEntry['doorStopId'];
  isActiveDoorCluster?: boolean;
  isEncounter: boolean;
  isEncounterCompleted: boolean;
  isTokenCurrent: boolean;
  /** True for the tiles adjacent to the token's tile — plays a small delayed
   *  ripple bounce when the token lands so the landing feels physical. */
  isLandingNeighbor?: boolean;
  isUpcoming: boolean;
  isSpark40: boolean;
  /** True when this is the traffic-light tile and its green lights are lit.
   *  Drives the whole-tile green colouring (neutral otherwise). */
  isTrafficLightGreen?: boolean;
  tileIndex: number;
  showDebug: boolean;
  isMinimalBoardArt: boolean;
  technologyFragment?: VisibleTechnologyFragment;
  /** Uniform board scale (canonical 1000px → screen px). Used to size tiles to
   *  match the ring geometry regardless of viewport dimensions. */
  uniformScale: number;
}

export const BoardTile = memo(function BoardTile(props: BoardTileProps) {
  const {
    anchor,
    index,
    position,
    isStop,
    tileType,
    doorStopId,
    isActiveDoorCluster = false,
    isEncounter,
    isEncounterCompleted,
    isTokenCurrent,
    isLandingNeighbor = false,
    isUpcoming,
    isSpark40,
    isTrafficLightGreen = false,
    showDebug,
    isMinimalBoardArt,
    technologyFragment,
    uniformScale,
  } = props;

  const tileTypeClass = !isStop && tileType ? `island-tile--${tileType}` : '';
  const doorStopClass = tileType === 'landmark_door' && doorStopId ? `island-tile--door-${doorStopId}` : '';

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
  } else if (tileType === 'landmark_door' && doorStopId === 'boss') {
    iconContent = '👑';
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
        isTrafficLightGreen ? 'island-tile--traffic_light-green' : '',
        doorStopClass,
        isActiveDoorCluster ? 'island-tile--active-door-cluster' : '',
        isTokenCurrent ? 'island-tile--token-current' : '',
        isLandingNeighbor ? 'island-tile--landing-neighbor' : '',
        isUpcoming ? 'island-tile--upcoming' : '',
        !isMinimalBoardArt ? 'island-tile--alive' : '',
        technologyFragment ? 'island-tile--technology-fragment' : '',
      ].filter(Boolean).join(' ')}
      aria-label={technologyFragment ? `Tile ${index + 1}. ${technologyFragment.ariaLabel}` : undefined}
      style={{
        left: position.x,
        top: position.y,
        ['--tile-rotation-deg' as string]: `${isSpark40 ? anchor.tangentDeg + 180 : 0}deg`,
        ['--tile-upright-rotation-deg' as string]: `${isSpark40 ? -(anchor.tangentDeg + 180) : 0}deg`,
        ['--tile-index' as string]: String(index),
        ['--tile-scale' as string]: String(anchor.scale),
        ['--tile-render-scale' as string]: (anchor.scale * uniformScale).toFixed(4),
        ...(technologyFragment ? { ['--fragment-slot' as string]: String(technologyFragment.fragmentSlot), ['--fragment-animation-delay' as string]: `${technologyFragment.fragmentSlot * -0.11}s` } : {}),
        transform: `translate(-50%, -50%) rotate(var(--tile-rotation-deg)) scale(${(anchor.scale * uniformScale).toFixed(4)})`,
      }}
    >
      {/* Ground contact shadow — sits on the board plane below the raised tile. */}
      <span className="island-tile__shadow" aria-hidden="true" />

      {/* Extruded side face — the tile's physical thickness. */}
      <span className="island-tile__side" aria-hidden="true" />

      {/* Top face — carries the tile material, border, and clipped content. */}
      <span className="island-tile__face">
        {!isMinimalBoardArt && <span className="island-tile__shine" aria-hidden="true" />}

        <span className="island-tile__value">
          {iconContent}
        </span>

        {/* Completed overlay */}
        {isEncounterCompleted && (
          <span className="island-tile__completed-badge" aria-hidden="true">✓</span>
        )}

        {/* Tile number badge */}
        <span className="island-tile__badge" aria-hidden="true">{index + 1}</span>

        {showDebug && <small className="island-tile__anchor-id">{anchor.id}</small>}
      </span>

      {technologyFragment && (
        <span
          className="island-tile__popout island-tile__popout--technology-fragment"
          aria-hidden="true"
          data-fragment-slot={technologyFragment.fragmentSlot}
          data-testid={`technology-fragment-${technologyFragment.fragmentSlot}`}
          title={technologyFragment.ariaLabel}
        >
          {technologyFragment.imageSrc ? (
            <img
              className="island-tile__popout-image"
              src={technologyFragment.imageSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          ) : (
            <span className="island-tile__popout-emoji" aria-hidden="true">{technologyFragment.placeholder}</span>
          )}
        </span>
      )}
    </div>
  );
});
