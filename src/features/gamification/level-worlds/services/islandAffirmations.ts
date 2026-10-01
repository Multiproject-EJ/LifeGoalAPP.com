/**
 * A short positive affirmation greets the player at the start of every island
 * (user request 2026-09-30, e.g. "Where others see barren land, you see
 * possibilities!"). Presentation only; shown once per island visit.
 */
export const ISLAND_AFFIRMATIONS: readonly string[] = [
  'Where others see barren land, you see possibilities!',
  'Every great island starts with one small step. You just took it.',
  'You are building more than landmarks. You are building yourself.',
  'Small habits, big horizons. Let\'s go!',
  'You showed up. That is already a win.',
  'Progress, not perfection. One roll at a time.',
  'The tide rises for those who keep rowing.',
  'You have done hard things before. This is your next one.',
  'Curiosity is your compass. Follow it.',
  'Today you plant seeds others will call luck.',
  'Your future self is cheering you on from the next island.',
  'Steady hands build mighty towers.',
  'Each sunrise is a fresh island. Make it yours.',
  'You are the architect of this adventure.',
  'Courage is just one more try. You have plenty.',
  'The map grows every time you keep going.',
  'Little by little, the island becomes a home.',
  'You turn plans into places. Keep building.',
  'Calm mind, brave heart, bright island.',
  'You bring the light this island has been waiting for.',
];

export function resolveIslandAffirmation(islandNumber: number, cycleIndex = 0): string {
  const island = Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
  const cycle = Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex)) : 0;
  // Island 001 always opens with the signature line; later visits rotate.
  if (island === 1 && cycle === 0) return ISLAND_AFFIRMATIONS[0]!;
  const index = (island * 7 + cycle * 3) % ISLAND_AFFIRMATIONS.length;
  return ISLAND_AFFIRMATIONS[index]!;
}

export const ISLAND_AFFIRMATION_VISIBLE_MS = 4_200;

export function getIslandAffirmationVisitKey(islandNumber: number, cycleIndex: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:${Math.max(1, Math.floor(islandNumber))}`;
}
