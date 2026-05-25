export type CreatureStageLevel = 1 | 2 | 3 | 4;

export interface CreatureStageDefinition {
  familyId: string;
  baseCreatureId: string;
  stage: CreatureStageLevel;
  stageKey: string;
  displayName: string;
  assetImageKey: string;
  traitDepth: string[];
  shortRole: string;
  evolvesFromStageKey?: string;
  evolvesToStageKey?: string;
}

const CREATURE_STAGE_DEFINITIONS: CreatureStageDefinition[] = [
  {
    familyId: 'common-pebble-spirit',
    baseCreatureId: 'common-pebble-spirit',
    stage: 1,
    stageKey: 'common-pebble-spirit',
    displayName: 'Pebble Spirit',
    assetImageKey: 'common-pebble-spirit',
    traitDepth: ['Grounding'],
    shortRole: 'Helps the player pause.',
    evolvesToStageKey: 'common-pebble-spirit-lv2',
  },
  {
    familyId: 'common-pebble-spirit',
    baseCreatureId: 'common-pebble-spirit',
    stage: 2,
    stageKey: 'common-pebble-spirit-lv2',
    displayName: 'Cairn Spirit',
    assetImageKey: 'common-pebble-spirit-lv2',
    traitDepth: ['Grounding', 'Patience'],
    shortRole: 'Helps the player endure pressure.',
    evolvesFromStageKey: 'common-pebble-spirit',
    evolvesToStageKey: 'common-pebble-spirit-lv3',
  },
  {
    familyId: 'common-pebble-spirit',
    baseCreatureId: 'common-pebble-spirit',
    stage: 3,
    stageKey: 'common-pebble-spirit-lv3',
    displayName: 'Stonebloom Guardian',
    assetImageKey: 'common-pebble-spirit-lv3',
    traitDepth: ['Grounding', 'Patience', 'Stress Resilience'],
    shortRole: 'Helps the player stay steady when life feels heavy.',
    evolvesFromStageKey: 'common-pebble-spirit-lv2',
  },
];

export function getCreatureStagesForFamily(familyId: string): CreatureStageDefinition[] {
  return CREATURE_STAGE_DEFINITIONS
    .filter((stage) => stage.familyId === familyId)
    .sort((a, b) => a.stage - b.stage);
}

export function getCreatureStageByStageKey(stageKey: string): CreatureStageDefinition | null {
  return CREATURE_STAGE_DEFINITIONS.find((stage) => stage.stageKey === stageKey) ?? null;
}

export function getDefaultCreatureStageForCreature(creatureId: string): CreatureStageDefinition | null {
  return CREATURE_STAGE_DEFINITIONS.find((stage) => stage.baseCreatureId === creatureId && stage.stage === 1) ?? null;
}

export function getHighestKnownCreatureStageForCreature(creatureId: string): CreatureStageDefinition | null {
  const stages = CREATURE_STAGE_DEFINITIONS
    .filter((stage) => stage.baseCreatureId === creatureId)
    .sort((a, b) => b.stage - a.stage);
  return stages[0] ?? null;
}
