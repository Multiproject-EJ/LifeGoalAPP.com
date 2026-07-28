import React from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const momentumMatrixManifest: MinigameManifest = {
  id: 'momentum_matrix',
  title: 'Momentum Matrix',
  icon: '✦',
  Component: React.lazy(() => import('./MomentumMatrixMinigame')),
};
