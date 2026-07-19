import { memo } from 'react';

// ─── BoardRimDisc: the carved stone wheel the tile ring sits on ──────────────
// Renders a thick annulus (disc with a hole for the island art in the centre)
// directly beneath the tile ring so the whole board reads as one solid 3D
// object with real rim depth, instead of a flat circle of floating cards.
//
// Depth is faked the same way the individual tiles fake thickness: a darker
// copy of the ring is offset "down" within the tilted board plane (__wall),
// so its front/near crescent peeks out below the lit top face (__top) as the
// visible rim wall. A soft contact shadow (__shadow) grounds the whole disc.
// All layers share the camera-stage transform (camera pan/zoom + board tilt).

const CANONICAL_CENTER = 500;
const RING_RADIUS = 340; // SPARK36_RADIUS — tile ring centre radius (canonical px)
const TILE_HALF = 29; // half a 58px tile — tiles span RING_RADIUS ± TILE_HALF
// Rim frames the tiles: outer edge a little past the tiles, inner edge a little
// inside them, so the tiles sit embedded on the stone band.
const RIM_OUTER = RING_RADIUS + TILE_HALF + 14; // 383 canonical
// Inner edge kept close to the tiles' inner edge (311) so the rim adds little
// occlusion toward the centre, where the island/castle art shows through.
const RIM_INNER = RING_RADIUS - TILE_HALF - 12; // 299 canonical
const RIM_DEPTH = 17; // wall height (canonical px) before scaling

export interface BoardRimDiscProps {
  /** Board-centre screen coordinates (canonical 500,500 → screen). */
  centerX: number;
  centerY: number;
  /** Uniform board scale (canonical px → screen px). */
  uniformScale: number;
}

export const BoardRimDisc = memo(function BoardRimDisc({ centerX, centerY, uniformScale }: BoardRimDiscProps) {
  const outer = RIM_OUTER * uniformScale;
  const holePct = (RIM_INNER / RIM_OUTER) * 100;
  const depth = RIM_DEPTH * uniformScale;

  return (
    <div
      className="island-board-rim"
      aria-hidden="true"
      style={{
        left: centerX,
        top: centerY,
        ['--rim-size' as string]: `${(outer * 2).toFixed(2)}px`,
        ['--rim-hole' as string]: `${holePct.toFixed(2)}%`,
        ['--rim-depth' as string]: `${depth.toFixed(2)}px`,
      }}
    >
      <span className="island-board-rim__shadow" />
      <span className="island-board-rim__wall" />
      <span className="island-board-rim__top" />
    </div>
  );
});
