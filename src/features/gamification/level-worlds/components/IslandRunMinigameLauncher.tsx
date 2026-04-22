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
    // Fallback: unknown minigame, treat as abandoned
    return (
      <div style={{ color: '#fff', padding: '2rem', textAlign: 'center' }}>
        <p>Minigame &quot;{minigameId}&quot; not found.</p>
        <button onClick={() => onComplete({ completed: false })}>Close</button>
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
