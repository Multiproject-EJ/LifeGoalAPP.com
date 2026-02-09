import { WHEEL_SEGMENTS, MIN_ROTATIONS, MAX_ROTATIONS, type WheelSegment } from './wheelOfWinsTypes';

/**
 * Select a winning segment using weighted random selection
 */
export function selectWinningSegment(): WheelSegment {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const segment of WHEEL_SEGMENTS) {
    random -= segment.weight;
    if (random <= 0) {
      return segment;
    }
  }
  
  // Fallback to first segment (should never happen)
  return WHEEL_SEGMENTS[0];
}

/**
 * Calculate the rotation angle for the wheel to land on a specific segment
 * @param segmentIndex - The index of the winning segment (0-7)
 * @returns The total rotation angle in degrees
 */
export function calculateRotationAngle(segmentIndex: number): number {
  const segmentAngle = 360 / WHEEL_SEGMENTS.length; // 45 degrees per segment
  const randomRotations = MIN_ROTATIONS + Math.floor(Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS + 1));
  const baseRotation = randomRotations * 360;
  
  // Calculate the angle to land in the middle of the target segment
  // The wheel rotates clockwise, and the pointer is at the top
  // So we need to rotate to bring the segment to the top
  const segmentCenterAngle = segmentIndex * segmentAngle + segmentAngle / 2;
  
  // Subtract the segment angle from 360 to account for clockwise rotation
  const targetAngle = 360 - segmentCenterAngle;
  
  return baseRotation + targetAngle;
}

/**
 * Get the index of a segment in the WHEEL_SEGMENTS array
 */
export function getSegmentIndex(segment: WheelSegment): number {
  return WHEEL_SEGMENTS.findIndex(s => s.id === segment.id);
}

/**
 * Format rewards for display
 */
export function formatRewards(rewards: { coins: number; dice: number; tokens: number }): string {
  const parts: string[] = [];
  
  if (rewards.coins > 0) {
    parts.push(`+${rewards.coins} 🪙`);
  }
  if (rewards.dice > 0) {
    parts.push(`+${rewards.dice} 🎲`);
  }
  if (rewards.tokens > 0) {
    parts.push(`+${rewards.tokens} 🎟️`);
  }
  
  return parts.join(' ');
}
