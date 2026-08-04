import React from 'react';
import type { MinigameManifest } from '../../../level-worlds/services/islandRunMinigameTypes';

export const concordCategoriesManifest: MinigameManifest = {
  id: 'concord_categories',
  title: 'Concord Categories',
  icon: '◈',
  Component: React.lazy(() => import('./ConcordCategoriesMinigame')),
};
