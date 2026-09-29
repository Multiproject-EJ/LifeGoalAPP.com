/**
 * Island 001 Assembly — the big middle explosion hits the HUD.
 *
 * The blast sequence has three acts; act 2 (charges 8–9) is the biggest.
 * Its first blast sends a shockwave through the top bar: the bar rattles,
 * tears loose on one side and hangs, several neon segments die, and the smoke
 * cloud rolls over it leaving it dusty brown. Then the game's own robot crew
 * repairs it: the big Heavy Worker lifts the hanging side back up, the
 * Project Manager rewires the power, and the little Mini Artist sweeps the
 * dust off. Presentation only; the board waits for the repair before resuming.
 */
import { FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET } from './islandRunSignatureMissions';
import type { RobotMotion, RobotRole } from '../dev/RobotFamilyThreeModel';

/** First charge of the big middle act. */
export const ASSEMBLY_TOPBAR_BLAST_CHARGE = 8;
/** Whole top-bar sequence (keep in sync with assembly-topbar-blast.css, 9 s). */
export const ASSEMBLY_TOPBAR_BLAST_MS = 9_000;
/** Ordinary Assembly blasts hold the board for the blast beat. */
export const ASSEMBLY_BLAST_BOARD_WAIT_MS = 5_400;
/** The final blast plays the build and marina hand-off. */
export const ASSEMBLY_FINAL_BLAST_BOARD_WAIT_MS = 13_400;

/** Beats in seconds from the shockwave. */
export const ASSEMBLY_TOPBAR_BEATS = {
  shockwave: 0,
  hangSettled: 1.5,
  smokeClears: 2.6,
  heavyArrives: 2.4,
  liftStart: 3.4,
  liftEnd: 4.6,
  managerArrives: 4.4,
  powerRestored: 6.2,
  miniArrives: 6.0,
  sweepStart: 6.3,
  sweepEnd: 7.8,
  crewCheerEnd: 8.4,
  end: 9.0,
} as const;

/**
 * Vibration pattern (on/off ms): a rapid rattle series as the shockwave hits,
 * one long hard buzz as the bar tears loose, then one small tick as it comes
 * to rest hanging.
 */
export const ASSEMBLY_TOPBAR_BLAST_HAPTIC_PATTERN: readonly number[] = [
  28, 38, 28, 38, 28, 38, 28, 38, 28, 38, 28, 70,
  460, 260,
  45,
];

export function shouldAssemblyBlastHitTopbar(sectorAfter: number): boolean {
  return sectorAfter === ASSEMBLY_TOPBAR_BLAST_CHARGE && sectorAfter < FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET;
}

/** How long the board stays inert after a committed Assembly blast. */
export function resolveAssemblyBlastBoardWaitMs(sectorAfter: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  if (sectorAfter >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET) return ASSEMBLY_FINAL_BLAST_BOARD_WAIT_MS;
  if (shouldAssemblyBlastHitTopbar(sectorAfter)) return Math.max(ASSEMBLY_BLAST_BOARD_WAIT_MS, ASSEMBLY_TOPBAR_BLAST_MS + 250);
  return ASSEMBLY_BLAST_BOARD_WAIT_MS;
}

export interface AssemblyTopbarRobotPose {
  role: RobotRole;
  visible: boolean;
  /** Horizontal position across the bar, 0 left … 1 right. */
  x: number;
  /** Height relative to the bar's resting line: 0 at the bar, positive is below. */
  drop: number;
  motion: RobotMotion;
}

const B = ASSEMBLY_TOPBAR_BEATS;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const between = (t: number, start: number, end: number) => ease((t - start) / (end - start));

/**
 * Where each robot is at `t` seconds. They fly up from below, do their one
 * job each, cheer together briefly and drop away. Pure so it is testable.
 */
export function resolveAssemblyTopbarCrewPoses(t: number): AssemblyTopbarRobotPose[] {
  const leave = between(t, B.crewCheerEnd, B.end);
  const cheering = t >= B.sweepEnd && t < B.crewCheerEnd;
  // Heavy Worker: under the torn left side, lifts it level.
  const heavyIn = between(t, B.heavyArrives, B.liftStart);
  const heavy: AssemblyTopbarRobotPose = {
    role: 'heavy-worker',
    visible: t >= B.heavyArrives && t < B.end,
    x: 0.16,
    drop: (1 - heavyIn) * 1.6 + 0.35 * (1 - between(t, B.liftStart, B.liftEnd)) + leave * 1.8,
    motion: cheering ? 'celebrate' : t >= B.liftStart && t < B.liftEnd + 0.4 ? 'lift' : 'idle',
  };
  // Project Manager: rewires the power in the middle.
  const managerIn = between(t, B.managerArrives, B.managerArrives + 0.7);
  const manager: AssemblyTopbarRobotPose = {
    role: 'project-manager',
    visible: t >= B.managerArrives && t < B.end,
    x: 0.5,
    drop: (1 - managerIn) * 1.6 + leave * 1.8,
    motion: cheering ? 'celebrate' : t >= B.managerArrives + 0.5 && t < B.powerRestored ? 'work' : 'inspect',
  };
  // Mini Artist: sweeps the dust off from left to right.
  const miniIn = between(t, B.miniArrives, B.sweepStart);
  const mini: AssemblyTopbarRobotPose = {
    role: 'mini-artist',
    visible: t >= B.miniArrives && t < B.end,
    x: 0.12 + between(t, B.sweepStart, B.sweepEnd) * 0.76,
    drop: (1 - miniIn) * 1.6 + leave * 1.8,
    motion: cheering ? 'celebrate' : t >= B.sweepStart && t < B.sweepEnd ? 'paint' : 'idle',
  };
  return [heavy, manager, mini];
}
