import type { IslandRunMinigameProps } from './islandRunMinigameTypes';
import type { ComponentType } from 'react';

export interface IslandRunMinigameEntry {
  id: string;
  label: string;
  component: ComponentType<IslandRunMinigameProps>;
}

// Registry is populated by calling registerMinigame() — avoids circular imports
const registry = new Map<string, IslandRunMinigameEntry>();

export function registerMinigame(entry: IslandRunMinigameEntry) {
  registry.set(entry.id, entry);
}

export function getMinigame(id: string): IslandRunMinigameEntry | undefined {
  return registry.get(id);
}

export function getAllMinigames(): IslandRunMinigameEntry[] {
  return Array.from(registry.values());
}
