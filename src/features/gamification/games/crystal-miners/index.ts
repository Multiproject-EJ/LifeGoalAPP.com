import { lazy } from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';
export const crystalMinersManifest: MinigameManifest = {
  id: 'crystal_miners', title: 'Crystal Miners', icon: '⛏',
  Component: lazy(() => import('./CrystalMinersMinigame')),
};
