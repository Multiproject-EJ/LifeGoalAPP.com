import type { IslandRunContractV2StopStatus } from './islandRunContractV2StopResolver';

export type IslandRunStopTapOutcome = 'open' | 'locked' | 'ticket_required';

export function resolveIslandRunStopTapOutcome(input: {
  stopStatus?: IslandRunContractV2StopStatus | null;
  requiresTicket: boolean;
}): IslandRunStopTapOutcome {
  const status = input.stopStatus ?? null;
  if (status === 'locked') return 'locked';
  if (input.requiresTicket || status === 'ticket_required') return 'ticket_required';
  return 'open';
}
