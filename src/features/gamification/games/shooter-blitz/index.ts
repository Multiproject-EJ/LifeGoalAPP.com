/**
 * Shooter Blitz mini-game — public entry point.
 *
 * Consumers should import `shooterBlitzManifest` only, never the component file
 * directly. See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §3.3.
 */
import { lazy } from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const shooterBlitzManifest: MinigameManifest = {
  id: 'shooter_blitz',
  title: 'Shooter Blitz',
  icon: '🚀',
  Component: lazy(() =>
    import('./ShooterBlitz').then((module) => ({ default: module.ShooterBlitz })),
  ),
};
