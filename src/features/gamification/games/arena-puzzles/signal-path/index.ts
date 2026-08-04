import React from 'react';
import type { MinigameManifest } from '../../../level-worlds/services/islandRunMinigameTypes';

export const signalPathManifest: MinigameManifest = {
  id: 'signal_path',
  title: 'Signal Path',
  icon: '⌁',
  Component: React.lazy(() => import('./SignalPathMinigame')),
};
