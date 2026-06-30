import { getCreatureById } from './creatureCatalog';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { getIslandTechnologyAccess } from './islandRunTechnologyUnlocks';

export type IslandCommunicationChannel = 'inhabitant' | 'creature';

export type IslandCommunicationAccessReason =
  | 'available'
  | 'concord-not-built'
  | 'no-active-companion'
  | 'invalid-state';

export interface IslandCommunicationAccess {
  allowed: boolean;
  reason: IslandCommunicationAccessReason;
}

function hasValidOwnedActiveCompanion(
  record: Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'>,
): boolean {
  const activeCompanionId = typeof record.activeCompanionId === 'string' ? record.activeCompanionId.trim() : '';
  if (!activeCompanionId) return false;
  if (!getCreatureById(activeCompanionId)) return false;
  return Array.isArray(record.creatureCollection) && record.creatureCollection.some((entry) => (
    entry?.creatureId === activeCompanionId && Number(entry.copies ?? 0) > 0
  ));
}

export function getIslandCommunicationAccess(
  record: IslandRunGameStateRecord,
  channel: IslandCommunicationChannel,
): IslandCommunicationAccess {
  if (!record || typeof record !== 'object') return { allowed: false, reason: 'invalid-state' };

  const concordAccess = getIslandTechnologyAccess(record, 'the-concord');
  if (!concordAccess.active) return { allowed: false, reason: 'concord-not-built' };

  if (channel === 'inhabitant') return { allowed: true, reason: 'available' };

  if (channel === 'creature') {
    const activeCompanionId = typeof record.activeCompanionId === 'string' ? record.activeCompanionId.trim() : '';
    if (!activeCompanionId) return { allowed: false, reason: 'no-active-companion' };
    if (!hasValidOwnedActiveCompanion(record)) return { allowed: false, reason: 'invalid-state' };
    return { allowed: true, reason: 'available' };
  }

  return { allowed: false, reason: 'invalid-state' };
}

export function canUseIslandCommunication(record: IslandRunGameStateRecord): boolean {
  return getIslandCommunicationAccess(record, 'inhabitant').allowed;
}
