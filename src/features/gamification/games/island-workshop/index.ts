import React from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const islandWorkshopManifest: MinigameManifest = {
  id: 'island_workshop',
  title: 'Island Workshop',
  icon: '🛠️',
  Component: React.lazy(() => import('./IslandWorkshopMinigame')),
};
