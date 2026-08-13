import React from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const journeyDiscArenaManifest: MinigameManifest = {
  id: 'journey_disc_arena',
  title: 'Journey Disc Arena',
  icon: '✦',
  Component: React.lazy(() => import('./JourneyDiscArenaMinigame')),
};
