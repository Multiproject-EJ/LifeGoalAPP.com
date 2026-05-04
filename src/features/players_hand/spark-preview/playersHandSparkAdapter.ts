import type { ArchetypeHand, HandCard, HandRole } from '../../identity/archetypes/archetypeHandBuilder';
import { ARCHETYPE_DECK } from '../../identity/archetypes/archetypeDeck';
import type { SparkPreviewCard, SparkPreviewRarity } from './playersHandSparkTypes';

function toCards(hand: ArchetypeHand): HandCard[] {
  return [hand.dominant, hand.secondary, ...hand.supports, hand.shadow];
}

function deriveRarity(role: HandRole, level: number): SparkPreviewRarity {
  if (role === 'dominant' || level >= 4) return 'legendary';
  if (role === 'secondary' || level >= 3) return 'epic';
  if (role === 'support' || level >= 2) return 'rare';
  return 'common';
}

export function adaptArchetypeHandToSparkPreview(hand: ArchetypeHand): SparkPreviewCard[] {
  return toCards(hand).map((entry) => ({
    id: `${entry.card.id}-${entry.role}`,
    archetypeId: entry.card.id,
    title: entry.card.name,
    description: entry.card.drive,
    icon: entry.card.icon,
    color: entry.card.color,
    level: entry.level,
    role: entry.role,
    rarity: deriveRarity(entry.role, entry.level),
    isActive: entry.role === 'dominant',
  }));
}

export function buildDevOnlyFallbackSparkPreviewCards(): SparkPreviewCard[] {
  const picks = [
    { card: ARCHETYPE_DECK[0], role: 'dominant' as const, level: 4 },
    { card: ARCHETYPE_DECK[1], role: 'secondary' as const, level: 3 },
    { card: ARCHETYPE_DECK[2], role: 'support' as const, level: 2 },
    { card: ARCHETYPE_DECK[3], role: 'support' as const, level: 2 },
    { card: ARCHETYPE_DECK[4], role: 'shadow' as const, level: 1 },
  ];

  return picks.map((entry) => ({
    id: `${entry.card.id}-${entry.role}`,
    archetypeId: entry.card.id,
    title: entry.card.name,
    description: entry.card.drive,
    icon: entry.card.icon,
    color: entry.card.color,
    level: entry.level,
    role: entry.role,
    rarity: deriveRarity(entry.role, entry.level),
    isActive: entry.role === 'dominant',
  }));
}
