/**
 * Task Tower mini-game — public entry point.
 *
 * Task Tower is used as (a) a Mystery-stop content variant and (b) the
 * Feeding Frenzy event surface. Consumers should import `taskTowerManifest`
 * only, never the component file directly. See
 * `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §2.1 / §5.1.
 */
import { lazy } from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const taskTowerManifest: MinigameManifest = {
  id: 'task_tower',
  title: 'Task Tower',
  icon: '🗼',
  Component: lazy(() =>
    import('./TaskTower').then((module) => ({ default: module.TaskTower })),
  ),
};
