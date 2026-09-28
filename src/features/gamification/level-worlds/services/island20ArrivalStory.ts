/**
 * Island 020 arrival story. En route, Central Command orders the crew to
 * build the Lava Labyrinth and promises that the Forge Keepers will meet
 * them at the Obsidian Gate. On landing nobody is there. The little robot
 * flies over the citadel turret to look, flanked by the other two, and the
 * crew decides to build the labyrinth themselves.
 *
 * Presentation only: no gameplay state, no rewards.
 */
import type { RobotEmotion, RobotMotion, RobotRole } from '../dev/RobotFamilyThreeModel';

export const ISLAND_20_ARRIVAL_ISLAND_NUMBER = 20;

export type Island20ArrivalSpeaker = 'Central Command' | 'Bolt' | 'Pixel' | 'Marshal';
export type Island20ArrivalPhase = 'recap' | 'landing' | 'empty' | 'flyover' | 'report';

export interface Island20ArrivalBeat {
  phase: Island20ArrivalPhase;
  startS: number;
  speaker: Island20ArrivalSpeaker;
  text: string;
}

/** Bolt = heavy worker, Marshal = project manager, Pixel = the little mini artist. */
export const ISLAND_20_ARRIVAL_SPEAKER_ROLES: Record<Exclude<Island20ArrivalSpeaker, 'Central Command'>, RobotRole> = {
  Bolt: 'heavy-worker',
  Marshal: 'project-manager',
  Pixel: 'mini-artist',
};

export const ISLAND_20_ARRIVAL_BEATS: readonly Island20ArrivalBeat[] = Object.freeze([
  { phase: 'recap', startS: 0, speaker: 'Central Command', text: 'Orders: build the Lava Labyrinth. The Forge Keepers will meet you at the Obsidian Gate.' },
  { phase: 'landing', startS: 3.6, speaker: 'Marshal', text: 'Touchdown at the Obsidian Gate. Welcome party, stand by…' },
  { phase: 'empty', startS: 6.4, speaker: 'Bolt', text: 'Hello? …Anyone?' },
  { phase: 'empty', startS: 8.6, speaker: 'Marshal', text: 'No Forge Keepers. No one at all.' },
  { phase: 'flyover', startS: 10.8, speaker: 'Pixel', text: 'I’ll take a look from above!' },
  { phase: 'flyover', startS: 13.6, speaker: 'Pixel', text: 'Every street is empty… but the forges are still warm.' },
  { phase: 'report', startS: 17.4, speaker: 'Marshal', text: 'Then we build the labyrinth ourselves. Crew — to work.' },
]);

export const ISLAND_20_ARRIVAL_DURATION_S = 21;
export const ISLAND_20_FLYOVER_START_S = 10.8;
export const ISLAND_20_FLYOVER_END_S = 17.4;

export function resolveIsland20ArrivalBeat(elapsedS: number): Island20ArrivalBeat {
  let current = ISLAND_20_ARRIVAL_BEATS[0];
  for (const beat of ISLAND_20_ARRIVAL_BEATS) {
    if (elapsedS >= beat.startS) current = beat;
  }
  return current;
}

/** Tap to move on: the next beat's start, or the end of the story. */
export function nextIsland20ArrivalBeatStart(elapsedS: number): number {
  const next = ISLAND_20_ARRIVAL_BEATS.find((beat) => beat.startS > elapsedS + 0.001);
  return next ? next.startS : ISLAND_20_ARRIVAL_DURATION_S;
}

export interface Island20RobotPose {
  /** Normalised screen position, 0..1 from the top-left. */
  x: number;
  y: number;
  /** 1 = the leader's size; flankers sit a little further back. */
  scale: number;
  /** Yaw in radians so the robot faces where it flies. */
  heading: number;
  flying: boolean;
  visible: boolean;
  motion: RobotMotion;
  emotion: RobotEmotion;
}

/** Where the citadel turret sits in the default Island 020 board framing. */
export const ISLAND_20_TURRET_SCREEN = Object.freeze({ x: 0.5, y: 0.3 });

const GROUND_Y = 0.62;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Offsets from the leader: the little robot leads, the other two flank it. */
const FORMATION: Record<RobotRole, { dx: number; dy: number; lag: number; scale: number }> = {
  'mini-artist': { dx: 0, dy: 0, lag: 0, scale: 1 },
  'heavy-worker': { dx: -0.2, dy: 0.05, lag: 0.35, scale: 0.86 },
  'project-manager': { dx: 0.2, dy: 0.05, lag: 0.35, scale: 0.86 },
};

/** Standing on the empty gate before take-off. */
const GROUND_SPOTS: Record<RobotRole, number> = {
  'heavy-worker': 0.3,
  'mini-artist': 0.5,
  'project-manager': 0.7,
};

/**
 * The flight: lift off, loop once around the turret and come back down to
 * report. The leader draws the path; flankers follow it a moment later.
 */
function leaderFlightPoint(t: number): { x: number; y: number } {
  const turret = ISLAND_20_TURRET_SCREEN;
  if (t < 0.22) {
    const k = smooth(t / 0.22);
    return { x: 0.5, y: GROUND_Y + (turret.y - 0.1 - GROUND_Y) * k };
  }
  if (t < 0.78) {
    const k = (t - 0.22) / 0.56;
    const angle = -Math.PI / 2 + k * Math.PI * 2;
    return { x: turret.x + Math.cos(angle) * 0.24, y: turret.y + Math.sin(angle) * 0.1 };
  }
  const k = smooth((t - 0.78) / 0.22);
  return { x: 0.5, y: turret.y - 0.1 + (0.46 - (turret.y - 0.1)) * k };
}

export function resolveIsland20RobotPose(role: RobotRole, elapsedS: number, reducedMotion = false): Island20RobotPose {
  const beat = resolveIsland20ArrivalBeat(elapsedS);
  const concerned = beat.phase === 'empty' || beat.phase === 'landing';
  const emotion: RobotEmotion = beat.phase === 'report' ? 'focused' : beat.phase === 'flyover' ? 'curious' : concerned ? 'concerned' : 'friendly';
  const formation = FORMATION[role];
  if (beat.phase === 'recap') {
    return { x: GROUND_SPOTS[role], y: GROUND_Y, scale: formation.scale, heading: 0, flying: false, visible: false, motion: 'idle', emotion };
  }
  const flyWindow = ISLAND_20_FLYOVER_END_S - ISLAND_20_FLYOVER_START_S;
  const flightT = clamp01((elapsedS - ISLAND_20_FLYOVER_START_S - formation.lag) / flyWindow);
  if (elapsedS < ISLAND_20_FLYOVER_START_S || reducedMotion) {
    const settled = reducedMotion && elapsedS >= ISLAND_20_FLYOVER_START_S;
    return {
      x: settled ? 0.5 + formation.dx : GROUND_SPOTS[role],
      y: settled ? 0.46 + formation.dy : GROUND_Y,
      scale: formation.scale,
      heading: 0,
      flying: false,
      visible: true,
      motion: concerned ? 'listen' : 'idle',
      emotion,
    };
  }
  const start = { x: GROUND_SPOTS[role] - formation.dx, y: GROUND_Y - formation.dy };
  const joinT = clamp01(flightT / 0.2);
  const lead = leaderFlightPoint(flightT);
  const x = start.x + (lead.x - start.x) * smooth(joinT) + formation.dx;
  const y = start.y + (lead.y - start.y) * smooth(joinT) + formation.dy;
  const ahead = leaderFlightPoint(Math.min(1, flightT + 0.02));
  const heading = Math.atan2(ahead.x - lead.x, 0.02) * 0.6;
  return {
    x,
    y,
    scale: formation.scale,
    heading,
    flying: flightT > 0 && flightT < 1,
    visible: true,
    motion: flightT >= 1 ? 'direct' : 'inspect',
    emotion,
  };
}

// ── Seen once per island visit (per viewer) ──
const SEEN_PREFIX = 'lifegoal:island20-arrival-story:v1';

export function getIsland20ArrivalSeenKey(userId: string, cycleIndex: number): string {
  return `${SEEN_PREFIX}:${userId}:${Math.max(0, Math.floor(cycleIndex))}`;
}

export function readIsland20ArrivalSeen(key: string): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function markIsland20ArrivalSeen(key: string): void {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, '1'); } catch { /* private mode */ }
}

/**
 * Plays on a fresh arrival at Island 020 only: nothing built yet, the escape
 * not started, not seen this visit, and nothing else holding the screen.
 */
export function shouldPlayIsland20ArrivalStory(options: {
  islandNumber: number;
  hydrated: boolean;
  alreadySeen: boolean;
  anyLandmarkBuilt: boolean;
  escapeStarted: boolean;
  screenBusy: boolean;
}): boolean {
  return options.islandNumber === ISLAND_20_ARRIVAL_ISLAND_NUMBER
    && options.hydrated
    && !options.alreadySeen
    && !options.anyLandmarkBuilt
    && !options.escapeStarted
    && !options.screenBusy;
}
