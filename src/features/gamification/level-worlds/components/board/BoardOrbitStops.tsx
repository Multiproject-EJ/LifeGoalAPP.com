import { memo } from 'react';
import type { OrbitStopAnchor, TileAnchor } from '../../services/islandBoardLayout';

export type StopProgressState = 'pending' | 'active' | 'completed' | 'partial' | 'locked' | 'shop';

export interface OrbitStopVisualData {
  id: string;
  label: string;
  x: number;
  y: number;
  state: StopProgressState;
  stopId?: string;
  icon: string;
  hideLabel?: boolean;
  labelOffsetX?: number;
  labelOffsetY?: number;
  /**
   * When the landmark is locked behind an unpaid essence ticket, this is the
   * ticket cost in essence for the current island. Rendered as a small badge
   * on top of the lock icon ("🔒 70 ✨") so the player can see the price
   * without opening the prompt.
   */
  ticketCost?: number;
}

export interface BoardOrbitStopsProps {
  stopVisuals: OrbitStopVisualData[];
  activeStopId: string | null;
  sceneClass: string;
  onStopClick: (stopId: string) => void;
  getOrbitStopDisplayIcon: (state: StopProgressState | 'shop', icon: string) => string;
}

export const BoardOrbitStops = memo(function BoardOrbitStops(props: BoardOrbitStopsProps) {
  const { stopVisuals, activeStopId, sceneClass, onStopClick, getOrbitStopDisplayIcon } = props;

  return (
    <div className="island-run-board__orbit-stops">
      {stopVisuals.map((stopVisual) => {
        const showTicketCost =
          stopVisual.state === 'locked'
          && typeof stopVisual.ticketCost === 'number'
          && stopVisual.ticketCost > 0;
        return (
        <button
          key={stopVisual.id}
          type="button"
          className={[
            'island-orbit-stop',
            `island-orbit-stop--${stopVisual.state}`,
            `island-orbit-stop--${sceneClass}`,
            stopVisual.stopId && stopVisual.stopId === activeStopId ? 'island-orbit-stop--selected' : '',
          ].filter(Boolean).join(' ')}
          style={{ left: stopVisual.x, top: stopVisual.y }}
          onClick={() => {
            if (stopVisual.stopId) {
              onStopClick(stopVisual.stopId);
            }
          }}
          disabled={!stopVisual.stopId}
          aria-label={
            showTicketCost
              ? `${stopVisual.label} — locked, costs ${stopVisual.ticketCost} essence to open`
              : `${stopVisual.label} — ${stopVisual.state}`
          }
        >
          <span className="island-orbit-stop__icon" aria-hidden="true">
            {getOrbitStopDisplayIcon(stopVisual.state, stopVisual.icon)}
          </span>
          {showTicketCost ? (
            <span className="island-orbit-stop__ticket-cost" aria-hidden="true">
              {stopVisual.ticketCost} ✨
            </span>
          ) : null}
          <span
            className={`island-orbit-stop__label ${stopVisual.hideLabel ? 'island-orbit-stop__label--hidden' : ''}`}
            style={{
              transform: `translate(calc(-50% + ${stopVisual.labelOffsetX ?? 0}px), calc(-50% + ${stopVisual.labelOffsetY ?? 0}px))`,
            }}
            title={stopVisual.label}
          >
            {stopVisual.label}
          </span>
        </button>
        );
      })}
    </div>
  );
});
