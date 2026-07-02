import type { TokenAnimState } from './useTokenAnimation';
import type { TileAnchor } from '../../services/islandBoardLayout';

export interface BoardTokenProps {
  animState: TokenAnimState;
  /** The z-band of the tile the token is currently on */
  zBand: TileAnchor['zBand'];
}

/**
 * Renders the player token (spaceship) with squash/stretch and landing effects.
 * The token position comes from the animation hook, not from direct tile anchors.
 *
 * The ground-shadow blob is detached from the ship: while the token arcs
 * through a hop, the shadow stays on the board plane (offset down by the hop
 * elevation) and shrinks/fades with height, then snaps back under the ship on
 * landing — that separation is what sells the jump as 3D.
 */
export function BoardToken({ animState, zBand }: BoardTokenProps) {
  const { x, y, scaleX, scaleY, elevation, isMoving, isLanding } = animState;

  // Shadow shrinks and fades as the token rises (arc apex is ~25px).
  const shadowScale = Math.max(0.55, 1 - elevation / 55);
  const shadowOpacity = Math.max(0.22, 0.55 - elevation / 70);

  return (
    <div
      className={[
        'island-token',
        isMoving ? 'island-token--moving' : '',
        isLanding ? 'island-token--landing' : '',
        `island-token--zband-${zBand}`,
      ].filter(Boolean).join(' ')}
      style={{ left: x, top: y }}
    >
      {/* Detached ground shadow — stays on the board plane during hops */}
      <span
        className="island-token__shadow"
        aria-hidden="true"
        style={{
          transform: `translateX(-50%) translateY(${elevation.toFixed(1)}px) scale(${shadowScale.toFixed(3)})`,
          opacity: shadowOpacity.toFixed(3),
        }}
      />

      <div
        className="island-token__ship"
        aria-hidden="true"
        style={{ transform: `scaleX(${scaleX.toFixed(3)}) scaleY(${scaleY.toFixed(3)})` }}
      >
        <div className="island-token__ship-body"/>
        <div className="island-token__ship-fin island-token__ship-fin--left"/>
        <div className="island-token__ship-fin island-token__ship-fin--right"/>
        <div className="island-token__ship-thruster"/>
        <div className="island-token__ship-window"/>
      </div>

      {/* Landing ripple effect */}
      {isLanding && (
        <span className="island-token__landing-ripple" aria-hidden="true" />
      )}

      {/* Particle trail is handled by BoardParticles */}
    </div>
  );
}
