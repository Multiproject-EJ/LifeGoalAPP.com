import type { IslandRunGameStateRecord } from '../../gamification/level-worlds/services/islandRunGameStateStore';
import { getCreatureById } from '../../gamification/level-worlds/services/creatureCatalog';

/**
 * Today-screen pet: the player's paired creature lives on the Today screen as
 * a small companion. It walks, idles, naps, plays, sometimes wanders off
 * screen and comes back. Pure pacing logic — the only gameplay effects (the
 * daily feed and pairing) go through existing canonical actions.
 */

/** Every pet shares one maximum size so none takes over the screen. */
export const TODAY_PET_SIZE_PX = 60;

export type TodayPetCompanion = { creatureId: string; paired: boolean };

/**
 * The paired companion when owned; otherwise the player's first creature
 * (earliest collected) waiting to be made a pet. Null without creatures.
 */
export function resolveTodayPetCompanion(
  record: Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'>,
): TodayPetCompanion | null {
  const owned = record.creatureCollection.filter((entry) => entry.copies > 0 && getCreatureById(entry.creatureId));
  const activeId = typeof record.activeCompanionId === 'string' ? record.activeCompanionId.trim() : '';
  if (activeId && owned.some((entry) => entry.creatureId === activeId)) return { creatureId: activeId, paired: true };
  const first = [...owned].sort((a, b) => (a.firstCollectedAtMs || 0) - (b.firstCollectedAtMs || 0))[0];
  return first ? { creatureId: first.creatureId, paired: false } : null;
}

export type TodayPetAction =
  | { kind: 'walk'; toX: number; ms: number }
  | { kind: 'idle'; ms: number }
  | { kind: 'sleep'; ms: number }
  | { kind: 'play'; ms: number }
  | { kind: 'away'; side: 'left' | 'right'; ms: number };

/** Walk speed in screen-widths per second. */
export const TODAY_PET_WALK_SPEED = 0.16;

/**
 * Next thing the pet does, from its position (0..1 across the screen) and a
 * random source. Mostly wanders and idles; naps and play are treats; leaving
 * the screen is rare and always lasts a while.
 */
export function planTodayPetAction(x: number, random: () => number, reduced = false): TodayPetAction {
  const roll = random();
  if (reduced) return roll < 0.2 ? { kind: 'sleep', ms: 12_000 } : { kind: 'idle', ms: 6_000 };
  if (roll < 0.42) {
    const toX = 0.1 + random() * 0.8;
    return { kind: 'walk', toX, ms: Math.max(600, (Math.abs(toX - x) / TODAY_PET_WALK_SPEED) * 1000) };
  }
  if (roll < 0.66) return { kind: 'idle', ms: 1_800 + random() * 2_800 };
  if (roll < 0.8) return { kind: 'play', ms: 1_700 };
  if (roll < 0.93) return { kind: 'sleep', ms: 8_000 + random() * 8_000 };
  return { kind: 'away', side: x < 0.5 ? 'left' : 'right', ms: 20_000 + random() * 25_000 };
}

export type TodayPetBubble = 'feed' | 'pair' | 'pet' | 'play';

/** The three bubbles shown on tap: Feed (or Make-my-pet when unpaired), Pet, Play. */
export function todayPetBubbles(paired: boolean): [TodayPetBubble, TodayPetBubble, TodayPetBubble] {
  return [paired ? 'feed' : 'pair', 'pet', 'play'];
}
