export interface IslandRunCrewRelayMember {
  id: string;
  displayName: string;
  initials: string;
  color: string;
}

export interface IslandRunCrewRelaySimulation {
  eventId: string;
  goalLabel: string;
  initialPercent: number;
  progressPerPlayerAction: number;
  members: readonly IslandRunCrewRelayMember[];
}

const EVENT_GOAL_LABELS: Readonly<Record<string, string>> = Object.freeze({
  feeding_frenzy: 'Restore the harbour workshop',
  lucky_spin: 'Stabilise the Fortune Core',
  space_excavator: 'Reach the buried signal',
  companion_feast: 'Fill the island feast table',
});

const CREW: readonly IslandRunCrewRelayMember[] = Object.freeze([
  { id: 'miri', displayName: 'Miri', initials: 'MI', color: '#64d9d0' },
  { id: 'sol', displayName: 'Sol', initials: 'SO', color: '#f0c76d' },
  { id: 'ivo', displayName: 'Ivo', initials: 'IV', color: '#8eb7ff' },
]);

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function resolveIslandRunCrewRelaySimulation(options: {
  eventId: string;
  islandNumber: number;
}): IslandRunCrewRelaySimulation {
  const canonicalEventId = options.eventId.split(':')[0] || options.eventId;
  const seed = hashSeed(`${options.eventId}:${Math.max(1, Math.floor(options.islandNumber))}`);
  return {
    eventId: options.eventId,
    goalLabel: EVENT_GOAL_LABELS[canonicalEventId] ?? 'Complete the island crew goal',
    initialPercent: 48 + (seed % 17),
    progressPerPlayerAction: 6,
    members: CREW,
  };
}

export function resolveIslandRunCrewRelayPercent(options: {
  simulation: Pick<IslandRunCrewRelaySimulation, 'initialPercent' | 'progressPerPlayerAction'>;
  playerActions: number;
}): number {
  const actions = Math.max(0, Math.floor(options.playerActions));
  return Math.min(100, options.simulation.initialPercent + actions * options.simulation.progressPerPlayerAction);
}
