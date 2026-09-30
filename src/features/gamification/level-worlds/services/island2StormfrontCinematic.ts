/**
 * Island 002 Stormfront cinematic timeline (presentation only, never writes).
 *
 * gathering → wave → calm → boom → aftermath:
 * - gathering: the weather system rolls in; the sky darkens and heavy rain starts;
 * - wave: a cascading wall of lightning sweeps in from the horizon towards the
 *   island… and stops just short of the shore;
 * - calm: the rain eases off and the sky starts to clear. All seems good;
 * - boom: a massive strike hits the centre of the island and pieces break off
 *   the four outer landmarks;
 * - aftermath: debris settles, the sky clears, and the add-on mission arrives.
 *
 * Full-screen flashes stay at or below three per second, and reduced motion
 * removes the flashes and the shake entirely (photosensitivity).
 */

export type StormfrontCinematicBeat = 'gathering' | 'wave' | 'calm' | 'boom' | 'aftermath' | 'done';

export const STORMFRONT_CINEMATIC = {
  waveStart: 2.6,
  waveStop: 7.6,
  calmStart: 8.2,
  boom: 11.2,
  aftermath: 12.4,
  duration: 15.5,
} as const;

/** Global flash moments in the wave (seconds), then the boom. */
export const STORMFRONT_WAVE_FLASH_TIMES: readonly number[] = [3.3, 4.5, 5.4, 6.2, 6.9, 7.45];
const FLASH_LENGTH = 0.22;

/** Minimum gap between full-screen flashes, keeping to ≤ 3 flashes per second. */
export const STORMFRONT_MIN_FLASH_GAP_SECONDS = 1 / 3;

export interface StormfrontCinematicFrame {
  beat: StormfrontCinematicBeat;
  /** Storm darkness, 0 (clear) … 1 (black storm). */
  storm: number;
  /** Rain density, 0 … 1. */
  rain: number;
  /** Lightning wave front, 0 (horizon) … 1 (stopped at the shore); null outside the wave. */
  wave: number | null;
  /** Full-screen flash strength, 0 … 1 (always 0 with reduced motion). */
  flash: number;
  /** Seconds since the central strike, or null before it. */
  boomAge: number | null;
  /** Camera shake amplitude in world units (0 with reduced motion). */
  shake: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => { const x = clamp01(value); return x * x * (3 - 2 * x); };

export function resolveStormfrontCinematicBeat(t: number): StormfrontCinematicBeat {
  if (t >= STORMFRONT_CINEMATIC.duration) return 'done';
  if (t >= STORMFRONT_CINEMATIC.aftermath) return 'aftermath';
  if (t >= STORMFRONT_CINEMATIC.boom) return 'boom';
  if (t >= STORMFRONT_CINEMATIC.calmStart) return 'calm';
  if (t >= STORMFRONT_CINEMATIC.waveStart) return 'wave';
  return 'gathering';
}

export function resolveStormfrontCinematicFrame(t: number, reducedMotion: boolean): StormfrontCinematicFrame {
  const c = STORMFRONT_CINEMATIC;
  const time = Math.max(0, t);
  const beat = resolveStormfrontCinematicBeat(time);
  // Darken fast, hold through the wave, clear partly in the calm, dip at the
  // boom, then clear fully.
  let storm: number;
  if (time < c.waveStart) storm = smooth(time / c.waveStart);
  else if (time < c.calmStart) storm = 1;
  else if (time < c.boom) storm = 1 - 0.6 * smooth((time - c.calmStart) / (c.boom - c.calmStart));
  else storm = 0.55 * (1 - smooth((time - c.boom) / (c.duration - 0.6 - c.boom)));
  const rain = time < c.waveStart
    ? smooth((time - 0.6) / 1.6)
    : time < c.calmStart ? 1 : 1 - smooth((time - c.calmStart) / 1.8);
  const wave = time >= c.waveStart && time < c.calmStart
    ? smooth((time - c.waveStart) / (c.waveStop - c.waveStart))
    : null;
  const boomAge = time >= c.boom ? time - c.boom : null;
  let flash = 0;
  if (!reducedMotion) {
    for (const at of STORMFRONT_WAVE_FLASH_TIMES) {
      if (time >= at && time < at + FLASH_LENGTH) flash = Math.max(flash, 0.55 * (1 - (time - at) / FLASH_LENGTH));
    }
    if (boomAge !== null && boomAge < 0.6) flash = Math.max(flash, 1 - boomAge / 0.6);
  }
  const shake = reducedMotion || boomAge === null ? 0 : 0.9 * Math.max(0, 1 - boomAge / 1.1);
  return { beat, storm: clamp01(storm), rain: clamp01(rain), wave, flash: clamp01(flash), boomAge, shake };
}
