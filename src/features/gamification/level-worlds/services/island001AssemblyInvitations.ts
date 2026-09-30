/**
 * Island 001 finale gate: the Assembly meeting starts only after the Assembly
 * (and its marina) is built AND every building is Level 3; then the player
 * sends the invitations from the Mission Phone. The "sent" marker is a
 * per-player presentation flag, like the Mission Phone inbox.
 */
export const ISLAND_001_ASSEMBLY_INVITATIONS_STORAGE_PREFIX = 'lifegoal:island001-assembly-invitations:v1';

export function getIsland001AssemblyInvitationsKey(userId: string, cycleIndex: number): string {
  return `${ISLAND_001_ASSEMBLY_INVITATIONS_STORAGE_PREFIX}:${userId}:${Math.max(0, Math.floor(cycleIndex))}`;
}

export function readIsland001AssemblyInvitationsSent(userId: string, cycleIndex: number): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(getIsland001AssemblyInvitationsKey(userId, cycleIndex)) !== null;
  } catch {
    return false;
  }
}

export function writeIsland001AssemblyInvitationsSent(userId: string, cycleIndex: number, sentAtMs: number): void {
  try {
    window.localStorage.setItem(getIsland001AssemblyInvitationsKey(userId, cycleIndex), String(sentAtMs));
  } catch {
    // Storage unavailable: the phone may ask again next visit; nothing breaks.
  }
}

export type Island001AssemblyInvitationState = 'not_ready' | 'needs_buildings' | 'ready_to_send' | 'sent';

export function resolveIsland001AssemblyInvitationState(options: {
  assemblyComplete: boolean;
  buildLevels: readonly number[];
  invitationsSent: boolean;
  maxLevel?: number;
}): Island001AssemblyInvitationState {
  if (options.invitationsSent) return 'sent';
  if (!options.assemblyComplete) return 'not_ready';
  const maxLevel = options.maxLevel ?? 3;
  const allBuilt = options.buildLevels.length > 0 && options.buildLevels.every((level) => level >= maxLevel);
  return allBuilt ? 'ready_to_send' : 'needs_buildings';
}
