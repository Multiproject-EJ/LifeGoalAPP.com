import type { IslandRunControllerIntent } from '../../level-worlds/services/islandRunMinigameTypes';

export type ShooterLane = -1 | 0 | 1;

export function clampShooterLane(value: number): ShooterLane {
  if (value <= -1) return -1;
  if (value >= 1) return 1;
  return 0;
}

export function applyShooterStrafeIntent(currentLane: ShooterLane, intent: IslandRunControllerIntent): ShooterLane {
  if (intent === 'left') return clampShooterLane(currentLane - 1);
  if (intent === 'right') return clampShooterLane(currentLane + 1);
  return currentLane;
}

export function laneToPercent(lane: ShooterLane): number {
  if (lane === -1) return 12;
  if (lane === 1) return 88;
  return 50;
}

export function areLanesAligned(shipLane: ShooterLane, enemyLane: ShooterLane): boolean {
  return shipLane === enemyLane;
}

