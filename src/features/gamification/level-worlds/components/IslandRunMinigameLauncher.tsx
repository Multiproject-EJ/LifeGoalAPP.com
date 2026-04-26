import React from 'react';
import { getMinigame } from '../services/islandRunMinigameRegistry';
import type {
  IslandRunControllerInputProvider,
  IslandRunMinigameResult,
} from '../services/islandRunMinigameTypes';

interface IslandRunMinigameLauncherProps {
  minigameId: string;
  islandNumber: number;
  ticketBudget?: number;
  controllerInput?: IslandRunControllerInputProvider;
  launchConfig?: Record<string, unknown>;
  onComplete: (result: IslandRunMinigameResult) => void;
}

export function IslandRunMinigameLauncher({
  minigameId,
  islandNumber,
  ticketBudget,
  controllerInput,
  launchConfig,
  onComplete,
}: IslandRunMinigameLauncherProps) {
  const entry = getMinigame(minigameId);

  if (!entry) {
    // Safe fallback: unknown minigame stays in-board and offers explicit close.
    return (
      <div style={{ color: '#fff', padding: '2rem', textAlign: 'center', background: 'rgba(5, 10, 24, 0.92)', minHeight: '100%' }}>
        <h3 style={{ marginTop: 0 }}>🎮 Minigame Unavailable</h3>
        <p>Minigame &quot;{minigameId}&quot; is missing. This safe placeholder keeps you inside Island Run.</p>
        <button onClick={() => onComplete({ completed: false })}>Close and return to board</button>
      </div>
    );
  }

  const Component = entry.component;
  return (
    <Component
      islandNumber={islandNumber}
      ticketBudget={ticketBudget}
      controllerInput={controllerInput}
      launchConfig={launchConfig}
      onComplete={onComplete}
    />
  );
}
