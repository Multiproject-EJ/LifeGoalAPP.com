import React from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const companionFeastManifest: MinigameManifest = {
  id: 'companion_feast',
  title: 'Companion Feast',
  icon: '🐾',
  Component: React.lazy(() => import('./CompanionFeastMinigame')),
};
