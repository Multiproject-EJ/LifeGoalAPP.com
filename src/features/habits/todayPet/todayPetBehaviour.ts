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

export type TodayPetCompanion = { creatureId: string; paired: boolean; bondLevel?: number };

/**
 * The paired companion when owned; otherwise the player's first creature
 * (earliest collected) waiting to be made a pet. Null without creatures.
 */
export function resolveTodayPetCompanion(
  record: Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'>,
): TodayPetCompanion | null {
  const owned = record.creatureCollection.filter((entry) => entry.copies > 0 && getCreatureById(entry.creatureId));
  const activeId = typeof record.activeCompanionId === 'string' ? record.activeCompanionId.trim() : '';
  const active = activeId ? owned.find((entry) => entry.creatureId === activeId) : undefined;
  if (active) return { creatureId: activeId, paired: true, bondLevel: active.bondLevel };
  const first = [...owned].sort((a, b) => (a.firstCollectedAtMs || 0) - (b.firstCollectedAtMs || 0))[0];
  return first ? { creatureId: first.creatureId, paired: false, bondLevel: first.bondLevel } : null;
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

export type TodayPetMood = 'walk' | 'idle' | 'sleep' | 'play' | 'away' | 'happy' | 'eat' | 'chase';

/**
 * Creatures that have a real 3D model for the Today pet. Every other creature
 * keeps its 2D cutout until its 3D model is produced; the registry grows as
 * creature models land, so a creature is never shown with another's body.
 */
export const TODAY_PET_3D_CREATURE_IDS: readonly string[] = ['common-sproutling', 'common-garden-puff', 'rare-crown-drifter'];

export function hasTodayPet3dModel(creatureId: string): boolean {
  return TODAY_PET_3D_CREATURE_IDS.includes(creatureId);
}

export type TodayPetPose = {
  /** Vertical lift of the whole body (model units). */
  lift: number;
  /** Body squash/stretch: >1 is taller, <1 is squashed. */
  stretch: number;
  /** Extra body yaw on top of the facing turn (radians). */
  spin: number;
  /** Head nod (radians, +down). */
  nod: number;
  /** Head tilt (radians). */
  tilt: number;
  /** Arm swing amplitude applied +/- per arm (radians). */
  arms: number;
  /** Leaf sway added to each crown leaf (radians). */
  leaves: number;
  /** 0 open … 1 closed. */
  eyesClosed: number;
};

/**
 * Presentation pose of the 3D Today pet for a mood at time `t` seconds.
 * Pure so it stays testable and identical for every 3D creature rig.
 */
export function resolveTodayPetPose(mood: TodayPetMood, t: number, reduced = false): TodayPetPose {
  const breath = reduced ? 0 : Math.sin(t * 2.1) * 0.015;
  const blinkPhase = t % 4.2;
  const blink = !reduced && blinkPhase < 0.16 ? Math.sin((blinkPhase / 0.16) * Math.PI) : 0;
  const base: TodayPetPose = { lift: 0, stretch: 1 + breath, spin: 0, nod: 0, tilt: 0, arms: 0, leaves: reduced ? 0 : Math.sin(t * 1.4) * 0.04, eyesClosed: blink };
  if (reduced) return mood === 'sleep' ? { ...base, stretch: 0.94, nod: 0.18, eyesClosed: 1 } : base;
  switch (mood) {
    case 'walk':
    case 'chase': {
      const speed = mood === 'chase' ? 14 : 9;
      const step = Math.abs(Math.sin(t * speed));
      return { ...base, lift: step * (mood === 'chase' ? 0.16 : 0.09), stretch: 1 + (step - 0.5) * 0.06, tilt: Math.sin(t * speed) * 0.08, arms: Math.sin(t * speed) * 0.35, leaves: Math.sin(t * speed) * 0.12 };
    }
    case 'sleep':
      return { ...base, stretch: 0.93 + Math.sin(t * 1.1) * 0.025, nod: 0.22, tilt: 0.12, leaves: -0.12, eyesClosed: 1 };
    case 'play':
      return { ...base, spin: Math.sin(t * 3.4) * 0.5, lift: Math.abs(Math.sin(t * 6)) * 0.08, arms: 0.5 + Math.sin(t * 7) * 0.25, leaves: Math.sin(t * 7) * 0.18 };
    case 'happy': {
      const hop = Math.abs(Math.sin(t * 7.5));
      return { ...base, lift: hop * 0.22, stretch: 1 + hop * 0.08, arms: 0.9, leaves: 0.2 + Math.sin(t * 9) * 0.12, eyesClosed: 0.55 };
    }
    case 'eat':
      return { ...base, nod: 0.12 + Math.abs(Math.sin(t * 9)) * 0.2, arms: 0.35, stretch: 1 - Math.abs(Math.sin(t * 9)) * 0.04 };
    default:
      return base;
  }
}

// ── Pet stats card (user request 2026-10-02) ───────────────────────────────

export interface TodayPetStat { pct: number; label: string }
export interface TodayPetStats {
  feeling: TodayPetStat & { emoji: string };
  power: TodayPetStat;
  hunger: TodayPetStat;
  /** The real start-of-island companion bonus (only while paired). */
  islandBonusLabel: string | null;
  feedBonusLabel: string;
}

const TIER_POWER: Record<string, number> = { common: 30, uncommon: 42, rare: 55, epic: 70, legendary: 85, mythic: 95 };

/**
 * Presentation stats for the pet card. Power grows with rarity and bond;
 * hunger rises through the day until today's feed; feeling blends being fed,
 * a recent pet/play and the current mood.
 */
export function resolveTodayPetStats(options: {
  tier: string;
  bondLevel: number;
  fedToday: boolean;
  recentlyLoved: boolean;
  mood: TodayPetMood;
  hourOfDay: number;
  islandBonusLabel: string | null;
  feedDice?: number;
}): TodayPetStats {
  const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const bond = Math.max(1, Math.floor(Number.isFinite(options.bondLevel) ? options.bondLevel : 1));
  const powerPct = clamp((TIER_POWER[options.tier] ?? 30) + Math.min(20, (bond - 1) * 2));
  const hour = Math.max(0, Math.min(24, options.hourOfDay));
  const hungerPct = options.fedToday ? 0 : clamp(25 + hour * 3);
  const hungerLabel = options.fedToday ? 'Full' : hungerPct >= 70 ? 'Very hungry' : hungerPct >= 45 ? 'Hungry' : 'Peckish';
  let feelingPct = 45 + (options.fedToday ? 30 : 0) + (options.recentlyLoved ? 20 : 0) - (hungerPct >= 70 ? 15 : 0);
  if (options.mood === 'happy' || options.mood === 'play' || options.mood === 'chase') feelingPct += 10;
  if (options.mood === 'sleep') feelingPct = Math.max(feelingPct, 55);
  feelingPct = clamp(feelingPct);
  const feeling = options.mood === 'sleep'
    ? { label: 'Sleepy', emoji: '😴' }
    : feelingPct >= 85 ? { label: 'Overjoyed', emoji: '🥰' }
      : feelingPct >= 65 ? { label: 'Happy', emoji: '😊' }
        : feelingPct >= 45 ? { label: 'Content', emoji: '🙂' }
          : { label: 'Needs you', emoji: '🥺' };
  return {
    feeling: { pct: feelingPct, ...feeling },
    power: { pct: powerPct, label: `Bond Lv ${bond}` },
    hunger: { pct: hungerPct, label: hungerLabel },
    islandBonusLabel: options.islandBonusLabel,
    feedBonusLabel: options.fedToday ? 'Fed today' : `Feed · +${options.feedDice ?? 15} 🎲`,
  };
}
