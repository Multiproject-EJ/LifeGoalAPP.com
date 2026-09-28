/**
 * Fisherman's Village — the moments before the dragon (presentation only).
 *
 * The colossal catch sets off the old pond siren. The water starts draining,
 * a few villagers slip away while most stay to stare, then the fisherman
 * realises it is NOT a drill. The player can tap "Why?" — the answer depends
 * on how far the scene has gone — and the talk ends the instant the dragon
 * breaks the surface (7.2 s into the cinematic).
 */
export const DRAGON_PRELUDE_END_SECONDS = 7.2;
export const DRAGON_PRELUDE_NOT_A_DRILL_SECONDS = 4.6;
/** "Why?" becomes available once the siren has started. */
export const DRAGON_PRELUDE_ASK_FROM_SECONDS = 0.6;

export type DragonPreludeBeat = {
  from: number;
  speaker: 'Siren' | 'Fisherman' | 'Villagers';
  text: string;
};

/** Scripted beats, in order, timed to the drain → eruption cinematic. */
export const DRAGON_PRELUDE_BEATS: readonly DragonPreludeBeat[] = [
  { from: 0, speaker: 'Siren', text: 'WOOO-OOO-OOO…' },
  { from: 0.9, speaker: 'Fisherman', text: 'Hold on… is the pond… draining?' },
  { from: 2.2, speaker: 'Villagers', text: 'A few folk hurry home. Most stay to watch the water sink.' },
  { from: 3.4, speaker: 'Fisherman', text: 'Easy now. Probably just a drill.' },
  { from: DRAGON_PRELUDE_NOT_A_DRILL_SECONDS, speaker: 'Fisherman', text: 'NOT A DRILL! NOT A DRILL!' },
];

export function dragonPreludeBeat(elapsed: number): DragonPreludeBeat | null {
  if (elapsed < 0 || elapsed >= DRAGON_PRELUDE_END_SECONDS) return null;
  let current: DragonPreludeBeat | null = null;
  for (const beat of DRAGON_PRELUDE_BEATS) if (elapsed >= beat.from) current = beat;
  return current;
}

export function isDragonPreludeActive(elapsed: number): boolean {
  return elapsed >= 0 && elapsed < DRAGON_PRELUDE_END_SECONDS;
}

export function isDragonPreludePanic(elapsed: number): boolean {
  return isDragonPreludeActive(elapsed) && elapsed >= DRAGON_PRELUDE_NOT_A_DRILL_SECONDS;
}

export type DragonPreludeTalk =
  | { kind: 'ask'; label: 'Why?' }
  | { kind: 'reply'; text: string; followUp?: 'Prepare to run??' }
  | { kind: 'closed' };

/**
 * The conversation: what the fisherman answers depends on when you ask. A
 * late question gets the urgent line, and the player can press once more.
 * `asked` is how many times the player has tapped (0, 1 or 2).
 */
export function dragonPreludeTalk(elapsed: number, asked: number, askedAt: number | null): DragonPreludeTalk {
  if (!isDragonPreludeActive(elapsed) || elapsed < DRAGON_PRELUDE_ASK_FROM_SECONDS) return { kind: 'closed' };
  if (asked <= 0 || askedAt === null) return { kind: 'ask', label: 'Why?' };
  if (asked >= 2) return { kind: 'reply', text: 'RUN! It\'s coming up!' };
  if (askedAt < 2.4) return { kind: 'reply', text: 'That siren only sounds when something big stirs down there.' };
  if (askedAt < DRAGON_PRELUDE_NOT_A_DRILL_SECONDS) return { kind: 'reply', text: 'That catch you landed… it was bait. Something wants it back.' };
  return { kind: 'reply', text: 'Step away, and prepare to run!', followUp: 'Prepare to run??' };
}
