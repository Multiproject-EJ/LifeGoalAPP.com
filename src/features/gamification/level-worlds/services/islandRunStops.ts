import type { IslandBoardProfileId } from './islandBoardProfiles';

export type MysteryStopContentKind = 'event_minigame';

export interface IslandStopPlanEntry {
  /** Canonical stop ID matching the V2 contract: hatchery → habit → mystery → wisdom → boss. */
  stopId: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
  title: string;
  description: string;
  /**
   * Discriminator for rendering. The third landmark keeps the legacy
   * `'fixed_mystery'` discriminator for compatibility while rendering as the
   * Event Arena.
   */
  kind: 'fixed_hatchery' | 'fixed_habit' | 'fixed_mystery' | 'fixed_wisdom' | 'fixed_boss';
  /**
   * Only set when `kind === 'fixed_mystery'` — Stop 3 is now the event
   * minigame arena landmark. The legacy breathing/action/check-in rotation
   * lives in board clue-card curriculum instead of landmark completion.
   */
  mysteryContentKind?: MysteryStopContentKind;
  isBehaviorStop: boolean;
}

/**
 * Stop 3 used to rotate breathing/action/check-in/vision content. Those
 * reflective prompts now live on board clue cards, while this landmark is the
 * stable event-minigame arena that reuses the existing timed-event ticket
 * launcher.
 */

/**
 * Generate the canonical 5-stop plan for an island.
 *
 * Stop sequence (unified with Contract V2):
 *   0. Hatchery (fixed) — egg incubation
 *   1. Habit (fixed) — complete a habit/action
 *   2. Event Arena (fixed Stop 3) — active timed-event minigame launcher.
 *   3. Wisdom (fixed) — story, questionnaire, learning content
 *   4. Boss (fixed) — boss trial
 *
 * The third landmark keeps the historical stop ID ('mystery') for save-data and
 * narrative compatibility, but its player-facing role is now Event Arena.
 *
 * Landmarks are fully decoupled from ring tile indices — the `profileId` arg
 * is accepted for forward-compat with future board profiles but no longer
 * controls landmark positioning (that lives in the HUD layer).
 */
export function generateIslandStopPlan(
  islandNumber: number,
  _options?: { profileId?: IslandBoardProfileId },
): IslandStopPlanEntry[] {
  return [
    {
      stopId: 'hatchery',
      title: '🥚 Hatchery Landmark',
      description: 'Set one egg, grow it through stages, and unlock your companion momentum boost.',
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
      title: '🎪 Event Arena Landmark',
      description: 'Spend active event tickets to play the rotating event mini game and keep island momentum going.',
      kind: 'fixed_mystery',
      mysteryContentKind: 'event_minigame',
      isBehaviorStop: false,
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
