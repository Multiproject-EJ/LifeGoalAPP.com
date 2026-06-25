import type { IslandNarrativeDefinition } from './islandNarrativeTypes';
import { island001NarrativeDefinition } from './definitions/island001Narrative';

const ISLAND_NARRATIVE_DEFINITIONS: Readonly<Record<number, IslandNarrativeDefinition>> = {
  1: island001NarrativeDefinition,
};

export function getIslandNarrativeDefinition(islandNumber: number): IslandNarrativeDefinition | undefined {
  return ISLAND_NARRATIVE_DEFINITIONS[islandNumber];
}
