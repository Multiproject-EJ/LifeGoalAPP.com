import React from 'react';
import type { MinigameManifest } from '../../../level-worlds/services/islandRunMinigameTypes';

export const twinSigilsManifest: MinigameManifest = {
  id: 'twin_sigils',
  title: 'Twin Sigils',
  icon: '◐',
  Component: React.lazy(() => import('./TwinSigilsMinigame')),
};
