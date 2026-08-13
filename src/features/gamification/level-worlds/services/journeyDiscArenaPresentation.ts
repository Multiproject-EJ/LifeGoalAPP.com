/** Pure responsive framing shared by the Three.js scene and phone-fit tests. */
export const JOURNEY_DISC_ARENA_CAMERA_VERTICAL_FOV_DEGREES = 36;
export const JOURNEY_DISC_ARENA_VISUAL_LIP_RADIUS = 10.2;

export interface JourneyDiscArenaCameraFit {
  isPortrait: boolean;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  visibleHalfWidthAtArena: number;
  lipWidthPercent: number;
}

export function resolveJourneyDiscArenaCameraFit(width: number, height: number): JourneyDiscArenaCameraFit {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const isPortrait = safeHeight > safeWidth * 1.18;
  const position = isPortrait ? { x: 0, y: 60, z: 40 } : { x: 0, y: 15, z: 15.5 };
  const target = { x: 0, y: 0, z: isPortrait ? -0.15 : 0 };
  const distance = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
  const halfVerticalFovRadians = JOURNEY_DISC_ARENA_CAMERA_VERTICAL_FOV_DEGREES * Math.PI / 360;
  const visibleHalfWidthAtArena = distance * Math.tan(halfVerticalFovRadians) * (safeWidth / safeHeight);
  return {
    isPortrait,
    position,
    target,
    visibleHalfWidthAtArena,
    lipWidthPercent: JOURNEY_DISC_ARENA_VISUAL_LIP_RADIUS / visibleHalfWidthAtArena * 100,
  };
}
