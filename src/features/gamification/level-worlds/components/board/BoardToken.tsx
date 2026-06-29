import { forwardRef, type CSSProperties } from 'react';
import type { TokenAnimState } from './useTokenAnimation';
import type { TileAnchor } from '../../services/islandBoardLayout';

export interface BoardTokenProps {
  animState: TokenAnimState;
  zBand: TileAnchor['zBand'];
}

/**
 * Renders the player token. Frame-by-frame movement is written imperatively to
 * CSS variables by useTokenAnimation so React only re-renders for movement
 * boundaries (moving/landing) rather than every animation frame.
 */
export const BoardToken = forwardRef<HTMLDivElement, BoardTokenProps>(function BoardToken({ animState, zBand }, ref) {
  const { x, y, scaleX, scaleY, isMoving, isLanding } = animState;
  const style = {
    '--token-x': `${x}px`,
    '--token-y': `${y}px`,
    '--token-scale-x': scaleX.toFixed(3),
    '--token-scale-y': scaleY.toFixed(3),
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={[
        'island-token',
        isMoving ? 'island-token--moving' : '',
        isLanding ? 'island-token--landing' : '',
        `island-token--zband-${zBand}`,
      ].filter(Boolean).join(' ')}
      style={style}
    >
      <div className="island-token__ship" aria-hidden="true">
        <div className="island-token__ship-body"/>
        <div className="island-token__ship-fin island-token__ship-fin--left"/>
        <div className="island-token__ship-fin island-token__ship-fin--right"/>
        <div className="island-token__ship-thruster"/>
        <div className="island-token__ship-window"/>
      </div>

      {isLanding && (
        <span className="island-token__landing-ripple" aria-hidden="true" />
      )}
    </div>
  );
});
