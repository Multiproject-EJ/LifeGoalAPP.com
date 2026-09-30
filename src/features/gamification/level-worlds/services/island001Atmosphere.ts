/**
 * Island 001 atmosphere: time of day follows the player's progress, not the
 * clock. Sunrise on arrival → daylight as the buildings rise → golden hour
 * when every building is Level 3 → a calm, warm night once the Assembly is
 * complete, so the Assembly meeting happens under the stars.
 *
 * Pure presentation maths. It reads progress; it never writes gameplay state.
 */

export type Island001TimeOfDay = 'sunrise' | 'daylight' | 'golden' | 'night';

export const ISLAND_001_TIME_OF_DAY_ORDER: readonly Island001TimeOfDay[] = ['sunrise', 'daylight', 'golden', 'night'];

export const ISLAND_001_MAX_BUILDING_LEVEL = 3;

export interface Island001AtmosphereProgress {
  /** Build level of each Island 001 building (Hatchery, Habit, Event Arena, Wisdom). */
  buildLevels: readonly number[];
  /** The Assembly (crater mission) is complete. */
  assemblyComplete: boolean;
}

/** How far through all building levels the island is, 0..1. */
export function resolveIsland001DevelopmentFraction(progress: Island001AtmosphereProgress): number {
  const levels = progress.buildLevels;
  if (levels.length === 0) return 0;
  const total = levels.reduce((sum, level) => sum + Math.max(0, Math.min(ISLAND_001_MAX_BUILDING_LEVEL, Math.floor(level || 0))), 0);
  return total / (levels.length * ISLAND_001_MAX_BUILDING_LEVEL);
}

/**
 * Continuous position on the day: 0 sunrise, 1 daylight, 2 golden hour,
 * 3 night. Building levels move the sun from sunrise to golden hour; only a
 * finished island (every building Level 3 and the Assembly complete) brings
 * night.
 */
export function resolveIsland001DayPosition(progress: Island001AtmosphereProgress): number {
  const development = resolveIsland001DevelopmentFraction(progress);
  if (development >= 1 && progress.assemblyComplete) return 3;
  return development * 2;
}

export function resolveIsland001TimeOfDay(dayPosition: number): Island001TimeOfDay {
  const index = Math.max(0, Math.min(3, Math.round(dayPosition)));
  return ISLAND_001_TIME_OF_DAY_ORDER[index]!;
}

export interface Island001LightingKeyframe {
  /** Backdrop gradient: top, middle and horizon colours. */
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  /** Sun (or moon) disc colour and height on the backdrop, 0 horizon … 1 high. */
  sunDisc: string;
  sunHeight: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  sunColor: number;
  sunIntensity: number;
  /** Key-light direction (scene space). */
  sunPosition: readonly [number, number, number];
  fogColor: number;
  exposure: number;
  /** Street lamps, lanterns and windows: 0 off … 1 fully lit. */
  lampGlow: number;
  stars: number;
  /** Image-based environment light strength (the island's base ambient). */
  environment: number;
}

/** The existing island is the daylight keyframe; the others are warm variations of it. */
export const ISLAND_001_LIGHTING: Record<Island001TimeOfDay, Island001LightingKeyframe> = {
  sunrise: {
    skyTop: '#86a9d6', skyMid: '#f2c9b4', skyHorizon: '#ffb27c', sunDisc: '#fff0c4', sunHeight: 0.08,
    hemisphereSky: 0xffc9a4, hemisphereGround: 0x6e5a4c, hemisphereIntensity: 1.05,
    sunColor: 0xff9e62, sunIntensity: 2.35, sunPosition: [15, 4.5, 8],
    fogColor: 0xf3c1a0, exposure: 0.8, lampGlow: 0.35, stars: 0.08, environment: 0.26,
  },
  daylight: {
    skyTop: '#6fb8d3', skyMid: '#b9e1df', skyHorizon: '#f6c99b', sunDisc: '#fff7cd', sunHeight: 0.8,
    hemisphereSky: 0xeefcff, hemisphereGround: 0x847862, hemisphereIntensity: 1.6,
    sunColor: 0xfff1cb, sunIntensity: 3.15, sunPosition: [-9, 15, 10],
    fogColor: 0xbdebf5, exposure: 0.86, lampGlow: 0, stars: 0, environment: 0.4,
  },
  golden: {
    skyTop: '#7a86c8', skyMid: '#f4b98f', skyHorizon: '#ff9d5e', sunDisc: '#ffe0a0', sunHeight: 0.18,
    hemisphereSky: 0xffbf86, hemisphereGround: 0x6a4a36, hemisphereIntensity: 0.95,
    sunColor: 0xff8f3f, sunIntensity: 2.6, sunPosition: [-16, 4.5, 5],
    fogColor: 0xf0a878, exposure: 0.8, lampGlow: 0.6, stars: 0.12, environment: 0.24,
  },
  night: {
    skyTop: '#0b1538', skyMid: '#1f2d66', skyHorizon: '#46458a', sunDisc: '#eef2ff', sunHeight: 0.72,
    hemisphereSky: 0x6f7fd0, hemisphereGround: 0x1f1e33, hemisphereIntensity: 0.62,
    sunColor: 0x9fb2ff, sunIntensity: 0.7, sunPosition: [9, 14, -6],
    fogColor: 0x1a2350, exposure: 0.74, lampGlow: 1, stars: 1, environment: 0.1,
  },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mixHex(a: number, b: number, t: number): number {
  const channel = (value: number, shift: number) => (value >> shift) & 0xff;
  const mix = (shift: number) => Math.round(lerp(channel(a, shift), channel(b, shift), t)) << shift;
  return mix(16) | mix(8) | mix(0);
}

function mixCss(a: string, b: string, t: number): string {
  const value = mixHex(parseInt(a.slice(1), 16), parseInt(b.slice(1), 16), t);
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** Lighting at any point of the day, blended between the neighbouring keyframes. */
export function resolveIsland001Lighting(dayPosition: number): Island001LightingKeyframe {
  const position = Math.max(0, Math.min(3, dayPosition));
  const index = Math.min(2, Math.floor(position));
  const t = position - index;
  // Smoothstep inside each segment so no keyframe reads as a hard stop.
  const eased = t * t * (3 - 2 * t);
  const from = ISLAND_001_LIGHTING[ISLAND_001_TIME_OF_DAY_ORDER[index]!];
  const to = ISLAND_001_LIGHTING[ISLAND_001_TIME_OF_DAY_ORDER[index + 1]!];
  return {
    skyTop: mixCss(from.skyTop, to.skyTop, eased),
    skyMid: mixCss(from.skyMid, to.skyMid, eased),
    skyHorizon: mixCss(from.skyHorizon, to.skyHorizon, eased),
    sunDisc: mixCss(from.sunDisc, to.sunDisc, eased),
    sunHeight: lerp(from.sunHeight, to.sunHeight, eased),
    hemisphereSky: mixHex(from.hemisphereSky, to.hemisphereSky, eased),
    hemisphereGround: mixHex(from.hemisphereGround, to.hemisphereGround, eased),
    hemisphereIntensity: lerp(from.hemisphereIntensity, to.hemisphereIntensity, eased),
    sunColor: mixHex(from.sunColor, to.sunColor, eased),
    sunIntensity: lerp(from.sunIntensity, to.sunIntensity, eased),
    sunPosition: [
      lerp(from.sunPosition[0], to.sunPosition[0], eased),
      lerp(from.sunPosition[1], to.sunPosition[1], eased),
      lerp(from.sunPosition[2], to.sunPosition[2], eased),
    ],
    fogColor: mixHex(from.fogColor, to.fogColor, eased),
    exposure: lerp(from.exposure, to.exposure, eased),
    lampGlow: lerp(from.lampGlow, to.lampGlow, eased),
    stars: lerp(from.stars, to.stars, eased),
    environment: lerp(from.environment, to.environment, eased),
  };
}

/**
 * Street lamps are part of the island being developed: none before any
 * building, the first pair when the first building reaches Level 1, and
 * the full set once every building is Level 3.
 */
export function resolveIsland001StreetlightCount(progress: Island001AtmosphereProgress, capacity: number): number {
  const development = resolveIsland001DevelopmentFraction(progress);
  if (development <= 0 || capacity <= 0) return 0;
  return Math.min(capacity, Math.max(Math.min(2, capacity), Math.round(capacity * development)));
}

/** Warm glow along the playable route: grows with development, shows as the light falls. */
export function resolveIsland001PathGlow(progress: Island001AtmosphereProgress, lampGlow: number): number {
  const development = resolveIsland001DevelopmentFraction(progress);
  if (development <= 0) return 0;
  return Math.max(0, Math.min(1, lampGlow)) * (0.35 + 0.65 * development);
}

/**
 * Eases the presented day toward its target so progress reads as the sun
 * moving, not a background swap. About 90% of the way in `seconds`.
 */
export function stepIsland001DayPosition(current: number, target: number, deltaSeconds: number, seconds = 6): number {
  if (!Number.isFinite(current)) return target;
  const k = 1 - Math.exp(-Math.max(0, deltaSeconds) * (2.3 / Math.max(0.1, seconds)));
  const next = current + (target - current) * k;
  return Math.abs(target - next) < 0.0005 ? target : next;
}
