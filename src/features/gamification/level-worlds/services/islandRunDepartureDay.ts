/**
 * Departure Day — the pre-Island-001 garage send-off (see
 * docs/gauntlets/2026-09-29-pre-island-001-garage-departure.md).
 *
 * Pure timeline data so the 3D hangar, the React overlay and tests agree on
 * the beats. Presentation only: the only gameplay write in the whole flow is
 * the piece choice through the canonical `selectPlayerPiece` action.
 *
 * Story rules: the travellers are the crew and their robots on a diplomatic
 * mission; the player walks among them as the newest crew member. The
 * caretaker never appears here.
 */

export const DEPARTURE_DAY_DURATION = 15;

export type DepartureDayBeat = 'reveal' | 'transform' | 'crew-walk' | 'boarding' | 'departure';

export const DEPARTURE_DAY_BEATS: ReadonlyArray<{ beat: DepartureDayBeat; start: number; end: number }> = [
  { beat: 'reveal', start: 0, end: 2 },
  { beat: 'transform', start: 2, end: 6 },
  { beat: 'crew-walk', start: 6, end: 9.5 },
  { beat: 'boarding', start: 9.5, end: 11.5 },
  { beat: 'departure', start: 11.5, end: DEPARTURE_DAY_DURATION },
];

/** Crew beat overlaps the end of the transform, per the brief. */
const CREW_WALK_START = 5.2;
const CREW_WALK_END = 9.5;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function smooth(value: number, start: number, end: number): number {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function resolveDepartureDayBeat(timeSeconds: number): DepartureDayBeat {
  return DEPARTURE_DAY_BEATS.find((entry) => timeSeconds < entry.end)?.beat ?? 'departure';
}

export interface DepartureDayFrame {
  beat: DepartureDayBeat;
  /** 0..1 balcony and banner lights coming up. */
  lights: number;
  /**
   * Ship pose progress for `ExpeditionShipThreeModel.update` (0 = expanded
   * living mode, 1 = closed controller/flight shell). Starts closed, opens
   * in front of the crowd, closes again for departure.
   */
  shipPoseProgress: number;
  /** 0..1 crowd energy (waving speed/amplitude, cheer volume). */
  crowd: number;
  /** 0..1 how far the crew have walked the causeway toward the keel. */
  crewWalk: number;
  /** 0..1 crew rising on the keel lift into the ship (they fade out at 1). */
  boarding: number;
  /** 0..1 rolling door opening. */
  door: number;
  /** 0..1 ship lift-off and exit through the door. */
  liftOff: number;
  /** 0..1 fade to the Island 001 hand-off. */
  handoff: number;
}

export function resolveDepartureDayFrame(timeSeconds: number): DepartureDayFrame {
  const t = Math.max(0, Number.isFinite(timeSeconds) ? timeSeconds : 0);
  const open = smooth(t, 2, 6);
  const close = smooth(t, 11.5, 12.8);
  return {
    beat: resolveDepartureDayBeat(t),
    lights: smooth(t, 0, 1.6),
    shipPoseProgress: clamp01(1 - open + close),
    // A swell on the tree reveal, a second one as the ship leaves.
    crowd: clamp01(0.35 + 0.35 * smooth(t, 0.4, 2) + 0.3 * smooth(t, 4.2, 5.4) - 0.15 * smooth(t, 9.5, 11) + 0.15 * smooth(t, 12.5, 13.5)),
    crewWalk: smooth(t, CREW_WALK_START, CREW_WALK_END),
    boarding: smooth(t, 9.5, 11.5),
    door: smooth(t, 11.6, 13.2),
    liftOff: smooth(t, 12.4, 14.6),
    handoff: smooth(t, 14.2, DEPARTURE_DAY_DURATION),
  };
}

/** The picker hands the confirm button a loading state until this passes. */
export function isDepartureDayReady(progress: number): boolean {
  return progress >= 1;
}

/**
 * First viewing plays in full (the brief: required once, about 15 s); any
 * replay is skippable at once. Reduced motion always gets the held stills.
 */
export function resolveDepartureDaySkip(options: { hasSeenBefore: boolean }): { skippable: boolean } {
  return { skippable: options.hasSeenBefore };
}

/** Reduced motion: four held stills with crossfades instead of the film. */
export const DEPARTURE_DAY_REDUCED_MOTION_STILLS: readonly number[] = [1.8, 6.5, 10.5, 13.4];
export const DEPARTURE_DAY_REDUCED_MOTION_STILL_MS = 1_600;

export function resolveDepartureDaySeenKey(userId: string): string {
  return `island_run_departure_day_seen_${userId}`;
}
