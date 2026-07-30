import React from 'react';
import {
  resolveIslandRunCrewRelayPercent,
  resolveIslandRunCrewRelaySimulation,
} from '../services/islandRunCrewRelaySimulation';

export interface EventCrewRelayPreviewProps {
  activeEventId: string;
  islandNumber: number;
  playerActions: number;
}

export function EventCrewRelayPreview({
  activeEventId,
  islandNumber,
  playerActions,
}: EventCrewRelayPreviewProps): React.JSX.Element {
  const simulation = React.useMemo(
    () => resolveIslandRunCrewRelaySimulation({ eventId: activeEventId, islandNumber }),
    [activeEventId, islandNumber],
  );
  const progress = resolveIslandRunCrewRelayPercent({ simulation, playerActions });

  return (
    <aside
      className={`event-crew-relay${playerActions > 0 ? ' event-crew-relay--contributed' : ''}`}
      aria-label={`Crew simulation: ${simulation.goalLabel}, ${progress}% complete`}
    >
      <div className="event-crew-relay__topline">
        <span className="event-crew-relay__eyebrow">Crew relay</span>
        <span className="event-crew-relay__simulation">Simulation</span>
      </div>
      <div className="event-crew-relay__goal">
        <strong>{simulation.goalLabel}</strong>
        <span>{progress}%</span>
      </div>
      <div
        className="event-crew-relay__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="event-crew-relay__footer">
        <span className="event-crew-relay__members" aria-label="Simulated island crew">
          {simulation.members.map((member) => (
            <span
              key={member.id}
              title={`${member.displayName} · simulated crew`}
              style={{ '--crew-color': member.color } as React.CSSProperties}
            >
              {member.initials}
            </span>
          ))}
        </span>
        <span className="event-crew-relay__contribution">
          {playerActions > 0
            ? `You moved it +${playerActions * simulation.progressPerPlayerAction}%`
            : 'Your next play moves the goal'}
        </span>
      </div>
    </aside>
  );
}
