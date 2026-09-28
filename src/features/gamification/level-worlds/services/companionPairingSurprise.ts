import { getCompanionBonusForCreature, type CreatureCompanionBonus, type CreatureDefinition } from './creatureCatalog';

/**
 * Companion pairing surprise — each island visit your paired companion brings
 * a gift drawn at random: most often its natural kind (essence, spins or dice),
 * sometimes one of the others, and now and then a lucky double. The draw is
 * seeded by player, companion and island visit, so it is stable for the visit
 * and the existing once-per-visit grant still applies (no rerolling).
 */
export const PAIRING_NATURAL_SHARE = 0.6;
export const PAIRING_LUCKY_CHANCE = 0.12;

/** Proxy affinities that select each gift family in the canonical catalogue. */
const EFFECT_AFFINITY: Record<CreatureCompanionBonus['effect'], string> = {
  bonus_essence: 'Guardian',
  bonus_spin: 'Explorer',
  bonus_dice: 'Builder',
};

function hashUnit(seed: string, salt: string): number {
  let h = 2166136261;
  for (const ch of `${seed}|${salt}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return (h % 100000) / 100000;
}

export function rollCompanionPairingPerk(options: {
  creature: CreatureDefinition;
  bondLevel: number;
  seedKey: string;
}): CreatureCompanionBonus & { surprise: 'natural' | 'swap' | 'lucky' } {
  const natural = getCompanionBonusForCreature(options.creature, options.bondLevel);
  const pick = hashUnit(options.seedKey, 'effect');
  let effect = natural.effect;
  let surprise: 'natural' | 'swap' | 'lucky' = 'natural';
  if (pick >= PAIRING_NATURAL_SHARE) {
    const others = (Object.keys(EFFECT_AFFINITY) as CreatureCompanionBonus['effect'][]).filter((e) => e !== natural.effect);
    effect = others[pick < PAIRING_NATURAL_SHARE + (1 - PAIRING_NATURAL_SHARE) / 2 ? 0 : 1]!;
    surprise = 'swap';
  }
  const base = effect === natural.effect
    ? natural
    : getCompanionBonusForCreature({ ...options.creature, affinity: EFFECT_AFFINITY[effect] } as CreatureDefinition, options.bondLevel);
  if (hashUnit(options.seedKey, 'lucky') < PAIRING_LUCKY_CHANCE) {
    const amount = base.amount * 2;
    const unit = effect === 'bonus_essence' ? 'Essence' : effect === 'bonus_spin' ? `Spin${amount === 1 ? '' : 's'}` : 'Dice';
    return { ...base, amount, label: `+${amount} ${unit} (lucky!)`, surprise: 'lucky' };
  }
  return { ...base, surprise };
}

/**
 * Compass Book pairing tip: suggest upgrading to a Perfect Companion (a
 * personality match) the player owns, when the current pairing is not one.
 */
export function resolvePairingUpgradeSuggestion(options: {
  activeCompanionId: string | null;
  perfectCompanionIds: readonly string[];
  ownedCreatureIds: readonly string[];
}): string | null {
  const owned = new Set(options.ownedCreatureIds);
  const perfect = options.perfectCompanionIds.filter((id) => owned.has(id));
  if (perfect.length === 0) return null;
  if (options.activeCompanionId && perfect.includes(options.activeCompanionId)) return null;
  return perfect[0] ?? null;
}
