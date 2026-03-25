import type { CreatureDefinition, ShipZone } from './creatureCatalog';

export type WeaknessSupportTag =
  | 'stress_fragility'
  | 'decision_confusion'
  | 'low_consistency'
  | 'low_momentum'
  | 'low_confidence'
  | 'overwhelm';

export const AFFINITY_TO_ARCHETYPE_IDS: Record<string, string[]> = {
  Builder: ['architect', 'engineer', 'strategist'],
  Grounded: ['guardian', 'devotee'],
  Nurturer: ['caregiver', 'healer'],
  Steady: ['guardian', 'enforcer'],
  Explorer: ['explorer', 'pioneer', 'visionary'],
  Caregiver: ['caregiver', 'mentor', 'healer'],
  Mentor: ['mentor', 'sage', 'caregiver'],
  Peacemaker: ['peacemaker', 'diplomat'],
  Dreamer: ['dreamer', 'visionary'],
  Visionary: ['visionary', 'creator', 'pioneer'],
  Guardian: ['guardian', 'caregiver', 'enforcer'],
  Catalyst: ['challenger', 'inventor', 'creator'],
  Champion: ['champion', 'commander', 'warlord'],
  Strategist: ['strategist', 'architect', 'analyst'],
  Architect: ['architect', 'strategist', 'analyst'],
  Challenger: ['challenger', 'rebel', 'warlord'],
  Creator: ['creator', 'inventor', 'visionary'],
  Oracle: ['sage', 'mystic', 'philosopher'],
  Cosmic: ['mystic', 'visionary', 'sage'],
  Radiant: ['champion', 'healer', 'visionary'],
  Sage: ['sage', 'scholar', 'philosopher'],
  Commander: ['commander', 'champion', 'strategist'],
  Rebel: ['rebel', 'challenger', 'pioneer'],
};

export const AFFINITY_WEAKNESS_SUPPORT: Record<string, WeaknessSupportTag[]> = {
  Builder: ['low_consistency', 'overwhelm'],
  Grounded: ['stress_fragility', 'overwhelm'],
  Nurturer: ['low_confidence', 'stress_fragility'],
  Steady: ['low_consistency', 'decision_confusion'],
  Explorer: ['low_momentum', 'decision_confusion'],
  Caregiver: ['low_confidence', 'stress_fragility'],
  Mentor: ['decision_confusion', 'low_confidence'],
  Peacemaker: ['stress_fragility', 'overwhelm'],
  Dreamer: ['low_momentum', 'low_confidence'],
  Visionary: ['low_momentum', 'decision_confusion'],
  Guardian: ['stress_fragility', 'low_consistency'],
  Catalyst: ['low_momentum', 'overwhelm'],
  Champion: ['low_confidence', 'low_momentum'],
  Strategist: ['decision_confusion', 'overwhelm'],
  Architect: ['low_consistency', 'decision_confusion'],
  Challenger: ['low_confidence', 'low_momentum'],
  Creator: ['low_momentum', 'overwhelm'],
  Oracle: ['decision_confusion', 'stress_fragility'],
  Cosmic: ['overwhelm', 'stress_fragility'],
  Radiant: ['low_confidence', 'stress_fragility'],
  Sage: ['decision_confusion', 'overwhelm'],
  Commander: ['low_confidence', 'low_consistency'],
  Rebel: ['low_momentum', 'low_confidence'],
};

export function getArchetypeIdsForAffinity(affinity: string): string[] {
  return AFFINITY_TO_ARCHETYPE_IDS[affinity] ?? [];
}

export function getWeaknessSupportTagsForAffinity(affinity: string): WeaknessSupportTag[] {
  return AFFINITY_WEAKNESS_SUPPORT[affinity] ?? [];
}

export function getDefaultZonePreferencesForArchetypes(archetypeIds: string[]): ShipZone[] {
  const ids = new Set(archetypeIds);
  const zones: ShipZone[] = [];
  if (Array.from(ids).some((id) => ['caregiver', 'mentor', 'healer', 'devotee'].includes(id))) {
    zones.push('zen');
  }
  if (Array.from(ids).some((id) => ['champion', 'commander', 'challenger', 'warlord', 'architect'].includes(id))) {
    zones.push('energy');
  }
  if (Array.from(ids).some((id) => ['visionary', 'dreamer', 'mystic', 'sage', 'explorer'].includes(id))) {
    zones.push('cosmic');
  }
  return zones.length > 0 ? zones : ['zen'];
}

export function isCreatureSupportiveForWeakness(creature: CreatureDefinition, weaknessTag: WeaknessSupportTag): boolean {
  return getWeaknessSupportTagsForAffinity(creature.affinity).includes(weaknessTag);
}
