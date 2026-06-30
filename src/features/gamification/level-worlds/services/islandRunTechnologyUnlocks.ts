import type { IslandRunGameStateRecord, IslandRunTechnologyId } from './islandRunGameStateStore';

const ISLAND_ONE_KEY = '1';
const REQUIRED_CONCORD_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export interface IslandTechnologyBuildEligibility {
  eligible: boolean;
  alreadyBuilt: boolean;
  missingSlots: number[];
}

function normalizedSlotSet(values: unknown): Set<number> {
  const out = new Set<number>();
  if (!Array.isArray(values)) return out;
  for (const raw of values) {
    const idx = Math.floor(Number(raw));
    if (Number.isFinite(idx) && idx >= 0 && idx <= 8) out.add(idx);
  }
  return out;
}

export function resolveIslandTechnologyBuildEligibility(
  record: Pick<IslandRunGameStateRecord, 'techCollectionByIsland' | 'technologyUnlocksById'>,
  technologyId: IslandRunTechnologyId,
): IslandTechnologyBuildEligibility {
  const alreadyBuilt = Boolean(record.technologyUnlocksById?.[technologyId]?.active);
  if (technologyId !== 'the-concord') {
    return { eligible: false, alreadyBuilt, missingSlots: [...REQUIRED_CONCORD_SLOTS] };
  }
  const slots = normalizedSlotSet(record.techCollectionByIsland?.[ISLAND_ONE_KEY]);
  const missingSlots = REQUIRED_CONCORD_SLOTS.filter((slot) => !slots.has(slot));
  return { eligible: missingSlots.length === 0, alreadyBuilt, missingSlots };
}

export function getIslandTechnologyAccess(
  record: Pick<IslandRunGameStateRecord, 'technologyUnlocksById'>,
  technologyId: IslandRunTechnologyId,
): { built: boolean; active: boolean; builtAtMs: number | null } {
  const unlock = record.technologyUnlocksById?.[technologyId];
  const builtAtMs = typeof unlock?.builtAtMs === 'number' && Number.isFinite(unlock.builtAtMs) ? unlock.builtAtMs : null;
  return { built: builtAtMs !== null, active: Boolean(unlock?.active && builtAtMs !== null), builtAtMs };
}
