import React from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

/**
 * The Fortune Engine — the playable event game on the `lucky_spin` rotation
 * slot (it replaces the old Lucky Spin placeholder, so the manifest keeps the
 * canonical `lucky_spin` minigame id used by the event engine and launcher).
 */
export const fortuneEngineManifest: MinigameManifest = {
  id: 'lucky_spin',
  title: 'The Fortune Engine',
  icon: '🎡',
  Component: React.lazy(() => import('./FortuneEngineMinigame')),
};
