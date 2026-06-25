import { lazy } from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const spaceExcavatorManifest: MinigameManifest = {
  id: 'space_excavator',
  title: 'Space Excavator',
  icon: '/assets/icons/Eventgame_excavator.webp',
  Component: lazy(() => import('./SpaceExcavatorMinigame').then((module) => ({ default: module.SpaceExcavatorMinigame }))),
};
