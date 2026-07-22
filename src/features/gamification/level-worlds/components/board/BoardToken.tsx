import { forwardRef, memo, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { TokenAnimState } from './useTokenAnimation';
import type { TileAnchor } from '../../services/islandBoardLayout';

export interface BoardTokenProps {
  animState: TokenAnimState;
  /** The z-band of the tile the token is currently on */
  zBand: TileAnchor['zBand'];
}

export interface BoardTokenHandle {
  applyFrame: (state: TokenAnimState) => void;
}

const resolveTokenTransform = (x: number, y: number) => (
  `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%)`
);

/**
 * Renders the player token (spaceship) with squash/stretch and landing effects.
 * The token position comes from the animation hook, not from direct tile anchors.
 *
 * The ground-shadow blob is detached from the ship: while the token arcs
 * through a hop, the shadow stays on the board plane (offset down by the hop
 * elevation) and shrinks/fades with height, then snaps back under the ship on
 * landing — that separation is what sells the jump as 3D.
 */
export const BoardToken = memo(forwardRef<BoardTokenHandle, BoardTokenProps>(function BoardToken({ animState, zBand }, ref) {
  const { x, y, scaleX, scaleY, elevation, isMoving, isLanding } = animState;
  const rootRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);

  // Shadow shrinks and fades as the token rises (arc apex is ~25px).
  const shadowScale = Math.max(0.55, 1 - elevation / 55);
  const shadowOpacity = Math.max(0.22, 0.55 - elevation / 70);

  const applyFrame = useCallback((state: TokenAnimState) => {
    const root = rootRef.current;
    const shadow = shadowRef.current;
    const ship = shipRef.current;
    if (!root || !shadow || !ship) return;

    const frameShadowScale = Math.max(0.55, 1 - state.elevation / 55);
    const frameShadowOpacity = Math.max(0.22, 0.55 - state.elevation / 70);
    root.style.transform = resolveTokenTransform(state.x, state.y);
    root.classList.toggle('island-token--moving', state.isMoving);
    root.classList.toggle('island-token--landing', state.isLanding);
    shadow.style.transform = `translateX(-50%) translateY(${state.elevation.toFixed(1)}px) scale(${frameShadowScale.toFixed(3)})`;
    shadow.style.opacity = frameShadowOpacity.toFixed(3);
    ship.style.transform = `scaleX(${state.scaleX.toFixed(3)}) scaleY(${state.scaleY.toFixed(3)})`;
  }, []);

  useImperativeHandle(ref, () => ({ applyFrame }), [applyFrame]);
  useLayoutEffect(() => applyFrame(animState), [animState, applyFrame]);

  return (
    <div
      ref={rootRef}
      className={[
        'island-token',
        isMoving ? 'island-token--moving' : '',
        isLanding ? 'island-token--landing' : '',
        `island-token--zband-${zBand}`,
      ].filter(Boolean).join(' ')}
      style={{ left: 0, top: 0, transform: resolveTokenTransform(x, y) }}
    >
      {/* Detached ground shadow — stays on the board plane during hops */}
      <span
        ref={shadowRef}
        className="island-token__shadow"
        aria-hidden="true"
        style={{
          transform: `translateX(-50%) translateY(${elevation.toFixed(1)}px) scale(${shadowScale.toFixed(3)})`,
          opacity: shadowOpacity.toFixed(3),
        }}
      />

      <div
        ref={shipRef}
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
}));
