/**
 * Island stance: how the host civilization currently regards the expedition.
 * Presentation-only content (shown on the mission phone); it carries no gameplay
 * effect. Proposed v1 follows the 120-island escalation in
 * docs/gameplay/DIPLOMATIC_RECONSTRUCTION_AND_ARENA_STORY_PLAN.md:
 *
 * - 1–12 the Accord works: every island is Friendly.
 * - 13–29 cultures disagree about restoration: a few Diplomatic islands.
 * - 30, 72, 117 championship hosts negotiate formal rules: Diplomatic.
 * - 50–71 reconstruction has side effects: first Unfriendly islands.
 * - 73–108 sanctioned attacks and hard-to-read military orders: Unfriendly grows.
 * - 109–118 records conflict and the reveal lands: the only WAR islands.
 * - 119–120 course correction: back to Diplomatic, then Friendly.
 *
 * Anything not listed is Friendly (the default, about 55% of islands).
 */
export type IslandStance = 'friendly' | 'diplomatic' | 'unfriendly' | 'war';

export const ISLAND_STANCE_ISLAND_COUNT = 120;

const DIPLOMATIC_ISLANDS: readonly number[] = [
  16, 19, 22, 27, 30,
  35, 42, 45, 48,
  53, 56, 59, 65, 70, 72,
  76, 82, 88,
  93, 99, 105,
  109, 117, 119,
];

const UNFRIENDLY_ISLANDS: readonly number[] = [
  61, 64, 68,
  73, 75, 78, 79, 81, 84, 85, 87, 90,
  91, 94, 96, 98, 100, 101, 103, 104, 106, 108,
  110, 111, 112, 113, 114,
];

const WAR_ISLANDS: readonly number[] = [115, 116, 118];

const STANCE_BY_ISLAND: ReadonlyMap<number, IslandStance> = new Map<number, IslandStance>([
  ...DIPLOMATIC_ISLANDS.map((islandNumber) => [islandNumber, 'diplomatic'] as const),
  ...UNFRIENDLY_ISLANDS.map((islandNumber) => [islandNumber, 'unfriendly'] as const),
  ...WAR_ISLANDS.map((islandNumber) => [islandNumber, 'war'] as const),
]);

/** Stance for an island number; later cycles repeat the same 120-island roster. */
export function getIslandStance(islandNumber: number): IslandStance {
  const normalized = ((Math.max(1, Math.floor(islandNumber)) - 1) % ISLAND_STANCE_ISLAND_COUNT) + 1;
  return STANCE_BY_ISLAND.get(normalized) ?? 'friendly';
}
