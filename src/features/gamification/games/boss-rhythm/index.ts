import { lazy } from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const bossRhythmManifest: MinigameManifest = {
  id: 'boss_rhythm',
  title: 'Boss Rhythm Battle',
  icon: '🛸',
  Component: lazy(() => import('./BossRhythmMinigame').then((module) => ({ default: module.BossRhythmMinigame }))),
};
