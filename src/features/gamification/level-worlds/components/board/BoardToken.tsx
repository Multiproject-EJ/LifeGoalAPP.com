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
 */
export function BoardToken({ animState, zBand }: BoardTokenProps) {
  const { x, y, scaleX, scaleY, isMoving, isLanding } = animState;

  return (
    <div
      className={[
        'island-token',
        isMoving ? 'island-token--moving' : '',
        isLanding ? 'island-token--landing' : '',
        `island-token--zband-${zBand}`,
      ].filter(Boolean).join(' ')}
      style={{
        left: x,
        top: y,
        transform: `scaleX(${scaleX.toFixed(3)}) scaleY(${scaleY.toFixed(3)})`,
      }}
    >
      <div className="island-token__ship" aria-hidden="true">
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
