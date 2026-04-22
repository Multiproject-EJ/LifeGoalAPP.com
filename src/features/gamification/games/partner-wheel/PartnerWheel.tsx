import { useMemo } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import './partnerWheel.css';

interface LaunchConfig {
  source?: 'timed_event';
  eventId?: 'companion_feast';
  mode?: 'companion_feast';
  teamSize?: number;
  aiPartnerCount?: number;
}

function resolveLaunchConfig(raw: IslandRunMinigameProps['launchConfig']): Required<LaunchConfig> {
  const safe = raw ?? {};
  return {
    source: safe.source === 'timed_event' ? 'timed_event' : 'timed_event',
    eventId: safe.eventId === 'companion_feast' ? 'companion_feast' : 'companion_feast',
    mode: safe.mode === 'companion_feast' ? 'companion_feast' : 'companion_feast',
    teamSize: typeof safe.teamSize === 'number' && safe.teamSize > 0 ? Math.floor(safe.teamSize) : 4,
    aiPartnerCount:
      typeof safe.aiPartnerCount === 'number' && safe.aiPartnerCount >= 0
        ? Math.floor(safe.aiPartnerCount)
        : 3,
  };
}

export default function PartnerWheel({ onComplete, launchConfig }: IslandRunMinigameProps) {
  const config = useMemo(() => resolveLaunchConfig(launchConfig), [launchConfig]);

  return (
    <section className="partner-wheel" aria-label="Companion Feast Partner Wheel placeholder">
      <header className="partner-wheel__header">
        <h2>Companion Feast — Partner Wheel</h2>
        <p>
          Phase 6 placeholder: launcher contract + manifest are live. Multiplayer sync is intentionally deferred.
        </p>
      </header>

      <ul className="partner-wheel__team" aria-label="Partner team slots">
        {Array.from({ length: config.teamSize }, (_, index) => (
          <li key={index} className="partner-wheel__slot">
            <strong>{index === 0 ? 'You' : `AI Partner ${index}`}</strong>
            <span>{index === 0 ? 'Awaiting spins' : 'Stub teammate'}</span>
          </li>
        ))}
      </ul>

      <footer className="partner-wheel__actions">
        <button type="button" onClick={() => onComplete({ completed: false })}>
          Exit Placeholder
        </button>
        <button
          type="button"
          onClick={() =>
            onComplete({
              completed: true,
              reward: {
                spinTokens: 5,
              },
            })
          }
        >
          Simulate Milestone Clear
        </button>
      </footer>
    </section>
  );
}
