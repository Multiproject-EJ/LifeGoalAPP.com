import type { CSSProperties } from 'react';

/**
 * Controller shell geometry contract for Island Run footer-style controls.
 *
 * Keep this file visual-only: slots describe where controller buttons sit on
 * the shell, but they do not define gameplay behavior or state mutations.
 */
export type IslandRunControllerSlotId =
  | 'leftUpper'
  | 'leftLower'
  | 'centerCore'
  | 'centerBadge'
  | 'rightLower'
  | 'rightUpper';

export type IslandRunControllerSlot = {
  x: number;
  y: number;
  rotate: number;
  scale?: number;
  depth?: 'surface' | 'raised' | 'inset';
};

export const ISLAND_RUN_CONTROLLER_ASPECT_RATIO = '596 / 350';

export const ISLAND_RUN_CONTROLLER_SLOT_MAP: Record<IslandRunControllerSlotId, IslandRunControllerSlot> = {
  // Side actions sit high on the white shoulder contours, the roll/play control
  // occupies the upper blue bowl, and the badge clears the center control.
  leftUpper: { x: 18, y: 28, rotate: -3.5, scale: 0.96, depth: 'raised' },
  leftLower: { x: 11.5, y: 53, rotate: -8, scale: 0.92, depth: 'raised' },
  centerCore: { x: 50, y: 22, rotate: 0, scale: 1, depth: 'inset' },
  centerBadge: { x: 50, y: -4, rotate: 0, scale: 0.9, depth: 'surface' },
  rightLower: { x: 88.5, y: 53, rotate: 8, scale: 0.92, depth: 'raised' },
  rightUpper: { x: 82, y: 28, rotate: 3.5, scale: 0.96, depth: 'raised' },
};

export function getIslandRunControllerSlotStyle(slot: IslandRunControllerSlot): CSSProperties {
  return {
    '--slot-x': `${slot.x}%`,
    '--slot-y': `${slot.y}%`,
    '--slot-rotate': `${slot.rotate}deg`,
    '--slot-scale': `${slot.scale ?? 1}`,
  } as CSSProperties;
}
