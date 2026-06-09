import { clampIslandNumber } from './islandContentManifest';

/**
 * Compass curriculum engine.
 *
 * The 120-island journey is divided into themed phases (see the Compass design
 * doc). Each phase forces a theme for a block of islands; during that block the
 * Habit and Wisdom stops feed the Compass template's matching spoke. The journey
 * is book-ended by the ikigai fill (Compass 1.0, islands 1–20) and re-fill
 * (Compass 2.0, islands 111–120).
 *
 * This module is pure and deterministic — it derives everything from the island
 * number, holds no state, and never writes anything.
 */

export type CompassTheme = 'compass' | 'personality' | 'habits' | 'goals' | 'shield';

/** The template section a phase fills. 'center' is the ikigai core (Compass phases). */
export type CompassSpoke = 'center' | 'personality' | 'habits' | 'goals' | 'shield';

export type ShieldHalf = 'body' | 'mind';

/** The four ikigai directions filled during the Compass phases. */
export type CompassDirection = 'heart' | 'craft' | 'cause' | 'livelihood';

export type CompassPhaseId =
  | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | 'P11';

export type CompassPhase = {
  id: CompassPhaseId;
  islandRange: readonly [number, number];
  theme: CompassTheme;
  /** Curriculum version for the theme (1, 2, 3 → shown as 1.0/2.0/3.0). */
  version: number;
  spoke: CompassSpoke;
  /** Shield only: which half of the Shield spoke this phase fills. */
  shieldHalf?: ShieldHalf;
  /** Short human label, e.g. "Habits 2.0". */
  label: string;
};

export const COMPASS_PHASES: readonly CompassPhase[] = [
  { id: 'P1', islandRange: [1, 20], theme: 'compass', version: 1, spoke: 'center', label: 'Compass 1.0' },
  { id: 'P2', islandRange: [21, 30], theme: 'personality', version: 1, spoke: 'personality', label: 'Personality 1.0' },
  { id: 'P3', islandRange: [31, 40], theme: 'habits', version: 1, spoke: 'habits', label: 'Habits 1.0' },
  { id: 'P4', islandRange: [41, 50], theme: 'goals', version: 1, spoke: 'goals', label: 'Goals 1.0' },
  { id: 'P5', islandRange: [51, 60], theme: 'habits', version: 2, spoke: 'habits', label: 'Habits 2.0' },
  { id: 'P6', islandRange: [61, 70], theme: 'personality', version: 2, spoke: 'personality', label: 'Personality 2.0' },
  { id: 'P7', islandRange: [71, 80], theme: 'goals', version: 2, spoke: 'goals', label: 'Goals 2.0' },
  { id: 'P8', islandRange: [81, 90], theme: 'shield', version: 1, spoke: 'shield', shieldHalf: 'body', label: 'Shield 1.0 · Body' },
  { id: 'P9', islandRange: [91, 100], theme: 'personality', version: 3, spoke: 'personality', label: 'Personality 3.0' },
  { id: 'P10', islandRange: [101, 110], theme: 'shield', version: 2, spoke: 'shield', shieldHalf: 'mind', label: 'Shield 2.0 · Mind' },
  { id: 'P11', islandRange: [111, 120], theme: 'compass', version: 2, spoke: 'center', label: 'Compass 2.0' },
] as const;

export function getCompassPhase(islandNumber: number): CompassPhase {
  const safe = clampIslandNumber(islandNumber);
  return (
    COMPASS_PHASES.find((phase) => safe >= phase.islandRange[0] && safe <= phase.islandRange[1]) ??
    COMPASS_PHASES[0]
  );
}

/**
 * During a Compass (ikigai) phase, which of the four directions is in focus for
 * this island. Returns null outside Compass phases. The 20-island Compass phases
 * are split into four 5-island direction blocks (Heart → Craft → Cause →
 * Livelihood); the center "True North" is synthesised from all four afterward.
 */
const DIRECTION_ORDER: readonly CompassDirection[] = ['heart', 'craft', 'cause', 'livelihood'];

export function getCompassDirectionForIsland(islandNumber: number): CompassDirection | null {
  const phase = getCompassPhase(islandNumber);
  if (phase.theme !== 'compass') return null;
  const safe = clampIslandNumber(islandNumber);
  const offset = safe - phase.islandRange[0];
  // Split the phase span into four proportional direction blocks so both the
  // 20-island fill (P1) and the 10-island re-fill (P11) cover all four directions.
  const phaseLength = phase.islandRange[1] - phase.islandRange[0] + 1;
  const blockSize = phaseLength / DIRECTION_ORDER.length;
  const index = Math.min(DIRECTION_ORDER.length - 1, Math.floor(offset / blockSize));
  return DIRECTION_ORDER[index];
}

export const COMPASS_DIRECTION_META: Record<
  CompassDirection,
  { label: string; compassPoint: 'N' | 'E' | 'S' | 'W'; prompt: string; emoji: string }
> = {
  heart: { label: 'Heart', compassPoint: 'N', prompt: 'What do you love? What energizes you?', emoji: '❤️' },
  craft: { label: 'Craft', compassPoint: 'E', prompt: 'What are you good at? What comes naturally?', emoji: '🛠️' },
  cause: { label: 'Cause', compassPoint: 'S', prompt: 'What does your world need from you?', emoji: '🌍' },
  livelihood: { label: 'Livelihood', compassPoint: 'W', prompt: 'What can you be valued for? What sustains you?', emoji: '🌱' },
};

export const COMPASS_SPOKE_META: Record<
  CompassSpoke,
  { label: string; emoji: string; blurb: string }
> = {
  center: { label: 'True North', emoji: '🧭', blurb: 'Your ikigai — the synthesis of all four directions.' },
  personality: { label: 'Personality', emoji: '🎭', blurb: 'Who you are — your traits and identity.' },
  habits: { label: 'Habits', emoji: '🔄', blurb: 'What you do daily — your practice.' },
  goals: { label: 'Goals', emoji: '🎯', blurb: 'Where you are going — your direction.' },
  shield: { label: 'Shield', emoji: '🛡️', blurb: 'What protects you — body and mind resilience.' },
};

/** Theme → spoke contributed to when a stop is completed during that phase. */
export function getSpokeForIsland(islandNumber: number): CompassSpoke {
  return getCompassPhase(islandNumber).spoke;
}

export function formatCompassVersion(version: number): string {
  return `${version}.0`;
}
