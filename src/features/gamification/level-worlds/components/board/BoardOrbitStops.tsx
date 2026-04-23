import { memo, useRef } from 'react';
import type { OrbitStopAnchor, TileAnchor } from '../../services/islandBoardLayout';

export type StopProgressState = 'pending' | 'active' | 'completed' | 'partial' | 'locked' | 'ticket_required' | 'shop';

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
  /**
   * Optional "next best action" hint:
   *  - 'affordable' → locked landmark the player can open RIGHT NOW (sequence
   *    prerequisite met AND wallet ≥ ticket cost). Rendered as a pulsing red
   *    corner dot to draw the eye. Used by the PR2 attention-hints feature.
   *  - undefined → no dot rendered.
   */
  attentionHint?: 'affordable';
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
  const pointerHandledTargetsRef = useRef<WeakSet<EventTarget>>(new WeakSet());

  return (
    <div className="island-run-board__orbit-stops">
      {stopVisuals.map((stopVisual) => {
        const activateStop = () => {
          if (stopVisual.stopId) {
            onStopClick(stopVisual.stopId);
          }
        };
        const showTicketCost =
          (stopVisual.state === 'locked' || stopVisual.state === 'ticket_required')
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
          onPointerUp={(event) => {
            // Mobile reliability: trigger stop activation on pointer-up so touch
            // interactions still open ticket prompts even when parent gesture
            // layers interfere with synthesized click events.
            event.preventDefault();
            event.stopPropagation();
            pointerHandledTargetsRef.current.add(event.currentTarget);
            activateStop();
          }}
          onClick={(event) => {
            // Pointer interactions may fire both pointer-up and click. Suppress
            // only when this exact element already handled pointer-up so we
            // still keep click as a fallback on devices where pointer-up is
            // swallowed by gesture layers.
            if (pointerHandledTargetsRef.current.has(event.currentTarget)) {
              pointerHandledTargetsRef.current.delete(event.currentTarget);
              return;
            }
            activateStop();
          }}
          disabled={!stopVisual.stopId}
          aria-label={
            stopVisual.attentionHint === 'affordable' && showTicketCost
              ? `${stopVisual.label} — ready to open, costs ${stopVisual.ticketCost} essence`
              : showTicketCost
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
          {stopVisual.attentionHint === 'affordable' ? (
            <span
              className="island-orbit-stop__attention-dot island-orbit-stop__attention-dot--affordable"
              aria-hidden="true"
            />
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
