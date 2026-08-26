import React from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const skyboundExpeditionManifest: MinigameManifest = {
  id: 'skybound_expedition',
  title: 'Skybound Expedition',
  icon: '✈',
  Component: React.lazy(() => import('./SkyboundExpeditionMinigame')),
};
