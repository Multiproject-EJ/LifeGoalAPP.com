import React from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const partnerWheelManifest: MinigameManifest = {
  id: 'partner_wheel',
  title: 'Partner Wheel',
  icon: '🐾',
  Component: React.lazy(() => import('./PartnerWheel')),
};
