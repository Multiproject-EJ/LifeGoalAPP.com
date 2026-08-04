import React from 'react';
import type { MinigameManifest } from '../../../level-worlds/services/islandRunMinigameTypes';

export const lexiconRelayManifest: MinigameManifest = {
  id: 'lexicon_relay',
  title: 'Lexicon Relay',
  icon: 'A↗',
  Component: React.lazy(() => import('./LexiconRelayMinigame')),
};
