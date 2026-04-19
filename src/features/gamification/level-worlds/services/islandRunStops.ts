import type { IslandBoardProfileId } from './islandBoardProfiles';

/**
 * Mystery stop content kinds — the rotating content that fills the Mystery (Stop 3) slot.
 * Mystery = "big upgrade" stop; currently breathing/guided meditation, expanding over time.
 */
export type MysteryStopContentKind =
  | 'habit_action'
  | 'checkin_reflection'
  | 'breathing';

export interface IslandStopPlanEntry {
  /** Canonical stop ID matching the V2 contract: hatchery → habit → mystery → wisdom → boss. */
  stopId: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
  title: string;
  description: string;
  kind: 'fixed_hatchery' | 'fixed_habit' | 'fixed_wisdom' | 'fixed_boss' | MysteryStopContentKind;
  isBehaviorStop: boolean;
}

/**
 * Content pool for the Mystery stop (Stop 3).
 * Currently: breathing exercise, habit action, or check-in reflection.
 * This will evolve to include guided meditation and other wellness activities.
 */
const MYSTERY_STOP_CONTENT_POOL: Array<{
  kind: MysteryStopContentKind;
  title: string;
  description: string;
}> = [
  {
    kind: 'breathing',
    title: '🧘 Breathing / Guided Meditation',
    description: 'Complete a breathing exercise or guided meditation to center yourself.',
  },
  {
    kind: 'habit_action',
    title: '✅ Action Challenge',
    description: 'Complete one habit/action objective to stabilize momentum.',
  },
  {
    kind: 'checkin_reflection',
    title: '🧭 Check-in Reflection',
    description: 'Run a quick check-in/reflection to calibrate your next moves.',
  },
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate the canonical 5-stop plan for an island.
 *
 * Stop sequence (unified with Contract V2):
 *   0. Hatchery (fixed) — egg incubation
 *   1. Habit (fixed) — complete a habit/action
 *   2. Mystery (rotating content) — breathing, guided meditation, check-in, etc.
 *   3. Wisdom (fixed) — story, questionnaire, learning content
 *   4. Boss (fixed) — boss trial
 *
 * The Mystery stop's *content* rotates per island using seeded random selection
 * from MYSTERY_STOP_CONTENT_POOL, but the stop ID is always 'mystery'.
 *
 * Landmarks are fully decoupled from ring tile indices — the `profileId` arg
 * is accepted for forward-compat with future board profiles but no longer
 * controls landmark positioning (that lives in the HUD layer).
 */
export function generateIslandStopPlan(
  islandNumber: number,
  _options?: { profileId?: IslandBoardProfileId },
): IslandStopPlanEntry[] {
  const safeIsland = Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;

  // Select rotating content for the Mystery stop (seeded per island).
  const mysteryContentIndex = Math.floor(seededRandom(97 + safeIsland * 13) * MYSTERY_STOP_CONTENT_POOL.length);
  const mysteryContent = MYSTERY_STOP_CONTENT_POOL[mysteryContentIndex];

  return [
    {
      stopId: 'hatchery',
      title: '🥚 Hatchery Landmark',
      description: 'Set one egg and track stage progression over time.',
      kind: 'fixed_hatchery',
      isBehaviorStop: false,
    },
    {
      stopId: 'habit',
      title: '✅ Habit Landmark',
      description: 'Complete one habit or action objective to maintain momentum.',
      kind: 'fixed_habit',
      isBehaviorStop: true,
    },
    {
      stopId: 'mystery',
      title: mysteryContent.title,
      description: mysteryContent.description,
      kind: mysteryContent.kind,
      isBehaviorStop: true,
    },
    {
      stopId: 'wisdom',
      title: '📖 Wisdom Landmark',
      description: 'A short story, questionnaire, or learning moment to reflect on.',
      kind: 'fixed_wisdom',
      isBehaviorStop: false,
    },
    {
      stopId: 'boss',
      title: '👑 Boss Landmark',
      description: 'Boss trial closes the island and unlocks the next island.',
      kind: 'fixed_boss',
      isBehaviorStop: false,
    },
  ];
}
