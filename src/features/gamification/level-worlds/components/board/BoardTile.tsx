import { memo } from 'react';
import type { TileAnchor } from '../../services/islandBoardLayout';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';
import type { VisibleTechnologyFragment } from '../../services/islandTechnologyFragmentVisuals';

// ─── Engraved SVG icon set ────────────────────────────────────────────────────
// Small inlay-style function marks for the premium carved-slab tiles: muted
// accent fills + warm bronze ink strokes so glyphs read as set into the ivory
// slab, never as loud stickers. Sized 18×18 viewBox, rendered ~14px.

const GLYPH_INK = '#7c5c30';

const TILE_SVG_ICONS: Record<string, JSX.Element> = {
  currency: (
    // Small gold coin with an embossed four-point star (matches the concept).
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.6" fill="#e3b954" stroke="#8a6428" strokeWidth="1"/>
      <circle cx="9" cy="9" r="4.2" fill="none" stroke="#c79b3e" strokeWidth="0.7"/>
      <path d="M9 6L9.7 8.3L12 9L9.7 9.7L9 12L8.3 9.7L6 9L8.3 8.3L9 6Z" fill="#f6e3ae" stroke="#a9853e" strokeWidth="0.4"/>
    </svg>
  ),
  chest: (
    // Small gold treasure chest — a step above currency, still quiet.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="3.6" y="6.2" width="10.8" height="8.2" rx="1.5" fill="#d9a94e" stroke="#8a6428" strokeWidth="1"/>
      <rect x="3.6" y="6.2" width="10.8" height="3.4" rx="1.5" fill="#eccb7c"/>
      <path d="M3.6 9.6H14.4" stroke="#8a6428" strokeWidth="0.6"/>
      <rect x="7.7" y="8.2" width="2.6" height="3.4" rx="0.7" fill="#f6e3ae" stroke="#8a6428" strokeWidth="0.6"/>
    </svg>
  ),
  event: (
    // Legacy tile type — soft gold star, kept for safety.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M9 3.5L10.6 7.4H14.5L11.4 10L12.5 14L9 11.6L5.5 14L6.6 10L3.5 7.4H7.4L9 3.5Z" fill="#e7cd8f" stroke="#a9853e" strokeWidth="0.7"/>
    </svg>
  ),
  hazard: (
    // Small rounded warning triangle — risky, never horror-red.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M7.9 3.9a1.3 1.3 0 0 1 2.2 0l5 8.6a1.3 1.3 0 0 1-1.1 2H4a1.3 1.3 0 0 1-1.1-2Z" fill="#cd5240" stroke="#8f3526" strokeWidth="0.8"/>
      <rect x="8.35" y="6.6" width="1.3" height="4" rx="0.65" fill="#fdf3e4"/>
      <circle cx="9" cy="12" r="0.8" fill="#fdf3e4"/>
    </svg>
  ),
  micro: (
    // Quietest common tile — a small gold four-point sparkle, low visual weight.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M9 3.8L10.1 7.9L14.2 9L10.1 10.1L9 14.2L7.9 10.1L3.8 9L7.9 7.9L9 3.8Z" fill="#e0b64f" stroke="#a9853e" strokeWidth="0.6"/>
      <path d="M9 5.8L9.6 8.4L12.2 9L9.6 9.6L9 12.2L8.4 9.6L5.8 9L8.4 8.4L9 5.8Z" fill="#f6e3ae"/>
    </svg>
  ),
  encounter: (
    // Single controlled challenge bolt — energetic, not aggressive.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M10.8 2.8L5.6 10.2H8.6L7.2 15.2L12.4 7.8H9.4L10.8 2.8Z" fill="#e2803c" stroke="#9c4f1d" strokeWidth="0.8" strokeLinejoin="round"/>
    </svg>
  ),
  card: (
    // Calm magic — a small amethyst card pair with a pale star face.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="6.6" y="3" width="7.2" height="10.2" rx="1.3" fill="#b79ade" stroke="#6d4fa0" strokeWidth="0.8" transform="rotate(9 10.2 8.1)"/>
      <rect x="4.4" y="4" width="7.2" height="10.2" rx="1.3" fill="#8f6cc9" stroke="#5f4390" strokeWidth="0.9"/>
      <path d="M8 7L8.6 8.5L10.2 8.7L9 9.8L9.3 11.4L8 10.6L6.7 11.4L7 9.8L5.8 8.7L7.4 8.5L8 7Z" fill="#f1eafa"/>
    </svg>
  ),
  build_discount: (
    // Workshop value tag — muted green with a small gold hammer mark.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M4.5 6.4A1.6 1.6 0 0 1 6.1 4.8H9.5L14.5 9.8L10.1 14.2L5.1 9.2Z" fill="#7aa06a" stroke="#4c6b3f" strokeWidth="0.9" strokeLinejoin="round"/>
      <circle cx="7.5" cy="7.6" r="0.95" fill="#efe5cc" stroke="#8a6b3f" strokeWidth="0.6"/>
      <path d="M9.4 11.4L11.7 9.1" stroke="#e8c56a" strokeWidth="1" strokeLinecap="round"/>
      <path d="M10.9 8L12.8 9.9" stroke="#e8c56a" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  free_ticket: (
    // Warm gold ticket chip — restrained event-entry feel.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 6.8A1.3 1.3 0 0 1 4.3 5.5H13.7A1.3 1.3 0 0 1 15 6.8V8a1.2 1.2 0 0 0 0 2.4v1.2a1.3 1.3 0 0 1-1.3 1.3H4.3A1.3 1.3 0 0 1 3 11.6v-1.2A1.2 1.2 0 0 0 3 8V6.8Z" fill="#e0a45c" stroke="#9a6b33" strokeWidth="0.9"/>
      <path d="M7.2 6.2V12.6" stroke="#fdf3e4" strokeWidth="0.8" strokeDasharray="1.3 1.1"/>
    </svg>
  ),
  traffic_light: (
    // Slim carved-stone housing with 3 muted pips — no dark UI box.
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="6" y="2.8" width="6" height="12.4" rx="2.6" fill="#efe5cc" stroke={GLYPH_INK} strokeWidth="0.9"/>
      <circle cx="9" cy="5.8" r="1.25" fill="#c96a52"/>
      <circle cx="9" cy="9" r="1.25" fill="#d8a94e"/>
      <circle cx="9" cy="12.2" r="1.25" fill="#5f9e6e"/>
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" fill="#8fd2da" stroke="#3f8a92" strokeWidth="1.1"/>
      <rect x="7.2" y="5.6" width="3.6" height="6.8" rx="1" fill="#f4faf9" opacity="0.9"/>
    </svg>
  ),
};

// ─── Landmark-door gate glyphs ───────────────────────────────────────────────
// Every door shares the same small raised stone-gate inlay; the recessed
// doorway takes the landmark's accent and carries a tiny identifying mark so
// the five door families stay readable at iPhone scale across island skins.

function makeDoorGlyph(accent: string, accentDeep: string, detail: JSX.Element | null): JSX.Element {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      {/* Gold arch frame with a small finial, like the concept's landmark doors */}
      <path d="M9 2.2L9.9 3.8H8.1L9 2.2Z" fill="#d9a94e" stroke="#8a6428" strokeWidth="0.5"/>
      <path d="M4.4 15V8.6A4.6 4.8 0 0 1 13.6 8.6V15H4.4Z" fill="#e8d3a0" stroke="#8a6428" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M6.4 15V9.2A2.6 2.7 0 0 1 11.6 9.2V15H6.4Z" fill={accent} stroke={accentDeep} strokeWidth="0.6"/>
      {detail}
    </svg>
  );
}

const DOOR_GLYPHS: Record<string, JSX.Element> = {
  hatchery: makeDoorGlyph('#e2cf9c', '#b99a55', (
    // Pearl egg resting in the doorway
    <ellipse cx="9" cy="11.6" rx="1.5" ry="1.9" fill="#f8f1e0" stroke="#c9a250" strokeWidth="0.55"/>
  )),
  habit: makeDoorGlyph('#7db38f', '#4e7d5f', (
    // Growth sprout
    <path d="M9 13.8V11M9 11c-1.5 0-2.2-1-2.2-2.1 1.5 0 2.2 1 2.2 2.1Zm0 0c1.5 0 2.2-1 2.2-2.1-1.5 0-2.2 1-2.2 2.1Z" stroke="#eaf4ec" strokeWidth="0.75" fill="none" strokeLinecap="round"/>
  )),
  mystery: makeDoorGlyph('#a98fd4', '#7a5aa8', (
    // Crescent moon
    <path d="M10.3 10.1a2 2 0 1 1-1.9-2.9 2.4 2.4 0 0 0 1.9 2.9Z" fill="#f1eafa"/>
  )),
  wisdom: makeDoorGlyph('#6fb3ba', '#3f8a92', (
    // Watching eye
    <g>
      <path d="M6.7 11c.7-1 1.5-1.5 2.3-1.5s1.6.5 2.3 1.5c-.7 1-1.5 1.5-2.3 1.5S7.4 12 6.7 11Z" fill="#eef6f5" stroke="#3f8a92" strokeWidth="0.5"/>
      <circle cx="9" cy="11" r="0.7" fill="#3f8a92"/>
    </g>
  )),
};

// Boss phase — the same gate inlay with an ember-red doorway and a small
// gold crown (replaces the old emoji; dramatic but still carved-premium).
const BOSS_CROWN_ICON = makeDoorGlyph('#c96a52', '#8f3526', (
  <path d="M7 12.6L6.7 10.4L8 11.2L9 9.8L10 11.2L11.3 10.4L11 12.6H7Z" fill="#f0cf7e" stroke="#8a6428" strokeWidth="0.45" strokeLinejoin="round"/>
));

// Calm engraved check for completed encounters — carved straight into the
// slab (light catch below the incision), no badge chip around it.
const COMPLETED_CHECK_ICON = (
  <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
    <path d="M5.2 10.2L8 13L13 6.9" stroke="rgba(255,255,255,0.75)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5.2 9.5L8 12.3L13 6.2" stroke="#857349" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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
    iconContent = COMPLETED_CHECK_ICON;
  } else if (isEncounter) {
    iconContent = TILE_SVG_ICONS.encounter;
  } else if (tileType === 'landmark_door' && doorStopId === 'boss') {
    iconContent = BOSS_CROWN_ICON;
  } else if (tileType === 'landmark_door') {
    iconContent = (doorStopId && DOOR_GLYPHS[doorStopId]) || DOOR_GLYPHS.mystery;
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
