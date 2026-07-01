import type { IslandRunContractV2StopStatus } from './islandRunContractV2StopResolver';

export type IslandRunStopTapOutcome = 'open' | 'locked' | 'ticket_required';

export function resolveIslandRunStopTapOutcome(input: {
  stopStatus?: IslandRunContractV2StopStatus | null;
  requiresTicket: boolean;
}): IslandRunStopTapOutcome {
  const status = input.stopStatus ?? null;
  if (status === 'locked') return 'locked';
  if (status === 'ticket_required') return 'ticket_required';

  // When the canonical Contract V2 resolver gives us an explicit status, that
  // status already accounts for paid tickets. Do not let the static
  // "this stop type normally requires a ticket" flag re-lock an active paid
  // stop, or landing on Wisdom/Habit doors will suppress the play modal.
  if (status === 'active' || status === 'accessible' || status === 'postponed' || status === 'completed') return 'open';

  // Legacy callers may not have a resolver status yet; keep their derived
  // ticket requirement behavior for migration compatibility.
  if (input.requiresTicket) return 'ticket_required';
  return 'open';
}
