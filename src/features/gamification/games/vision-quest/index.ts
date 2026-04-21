/**
 * Vision Quest mini-game — public entry point.
 *
 * Vision Quest is the 4th Mystery-stop content variant (coexists with
 * breathing / habit_action / checkin_reflection / task_tower). Consumers
 * should import `visionQuestManifest` only, never the component file
 * directly. See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §2.2.
 */
import { lazy } from 'react';
import type { MinigameManifest } from '../../level-worlds/services/islandRunMinigameTypes';

export const visionQuestManifest: MinigameManifest = {
  id: 'vision_quest',
  title: 'Vision Quest',
  icon: '🔮',
  Component: lazy(() =>
    import('./VisionQuest').then((module) => ({ default: module.VisionQuest })),
  ),
};
