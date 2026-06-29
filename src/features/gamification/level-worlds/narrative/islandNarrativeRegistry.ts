import type { IslandNarrativeDefinition } from './islandNarrativeTypes';
import { island001NarrativeDefinition } from './definitions/island001Narrative';
import { island002NarrativeDefinition } from './definitions/island002Narrative';
import { island003NarrativeDefinition } from './definitions/island003Narrative';
import { island004NarrativeDefinition } from './definitions/island004Narrative';
import { island005NarrativeDefinition } from './definitions/island005Narrative';

const ISLAND_NARRATIVE_DEFINITIONS: Readonly<Record<number, IslandNarrativeDefinition>> = {
  1: island001NarrativeDefinition,
  2: island002NarrativeDefinition,
  3: island003NarrativeDefinition,
  4: island004NarrativeDefinition,
  5: island005NarrativeDefinition,
};

export function getIslandNarrativeDefinition(islandNumber: number): IslandNarrativeDefinition | undefined {
  return ISLAND_NARRATIVE_DEFINITIONS[islandNumber];
}

/** Island numbers that have an authored narrative definition. */
export function getRegisteredNarrativeIslandNumbers(): number[] {
  return Object.keys(ISLAND_NARRATIVE_DEFINITIONS)
    .map((key) => Number(key))
    .sort((a, b) => a - b);
}

/** All registered narrative definitions (for validation / tooling). */
export function getAllIslandNarrativeDefinitions(): IslandNarrativeDefinition[] {
  return getRegisteredNarrativeIslandNumbers().map((islandNumber) => ISLAND_NARRATIVE_DEFINITIONS[islandNumber]);
}
