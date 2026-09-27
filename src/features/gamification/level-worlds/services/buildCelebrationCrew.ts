/**
 * Who celebrates a build: level completions get one or two of the robots
 * (random, so it stays fresh); a 100% built island gets the whole crew.
 */
import type { RobotRole } from '../dev/RobotFamilyThreeModel';

export type CelebrationCrewSize = 'all' | 'random';

export const CELEBRATION_ROLES: readonly RobotRole[] = ['heavy-worker', 'project-manager', 'mini-artist'];

export function pickCelebrationCrew(size: CelebrationCrewSize, random: () => number): RobotRole[] {
  if (size === 'all') return [...CELEBRATION_ROLES];
  const count = random() < 0.5 ? 1 : 2;
  const pool = [...CELEBRATION_ROLES];
  const chosen: RobotRole[] = [];
  while (chosen.length < count && pool.length) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    chosen.push(pool.splice(index, 1)[0]);
  }
  // Keep left-to-right stage order.
  return CELEBRATION_ROLES.filter((role) => chosen.includes(role));
}
