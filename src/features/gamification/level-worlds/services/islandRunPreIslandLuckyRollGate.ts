import {
  getIslandRunLuckyRollSessionKey,
  type IslandRunLuckyRollSession,
  type IslandRunLuckyRollSessionsByMilestone,
} from './islandRunGameStateStore';
import { getIslandRunIslandMetadata } from './islandRunIslandMetadata';

export type IslandRunPreIslandLuckyRollGateStatus =
  | 'not_required'
  | 'required_missing_session'
  | 'required_active'
  | 'required_completed_unbanked'
  | 'satisfied_banked'
  | 'expired_or_blocked';

export interface ResolveIslandRunPreIslandLuckyRollGateOptions {
  featureEnabled: boolean;
  islandNumber: number;
  cycleIndex: number;
  luckyRollSessionsByMilestone: IslandRunLuckyRollSessionsByMilestone | null | undefined;
}

export interface IslandRunPreIslandLuckyRollGate {
  status: IslandRunPreIslandLuckyRollGateStatus;
  isRequired: boolean;
  blocksIslandStart: boolean;
  islandNumber: number;
  cycleIndex: number;
  sessionKey: string | null;
  luckyRollSession: IslandRunLuckyRollSession | null;
}

const BLOCKING_STATUSES = new Set<IslandRunPreIslandLuckyRollGateStatus>([
  'required_missing_session',
  'required_active',
  'required_completed_unbanked',
  'expired_or_blocked',
]);

function normalizeIslandNumber(islandNumber: number): number {
  return Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
}

function normalizeCycleIndex(cycleIndex: number): number {
  return Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex)) : 0;
}

export function resolveIslandRunPreIslandLuckyRollGate(
  options: ResolveIslandRunPreIslandLuckyRollGateOptions,
): IslandRunPreIslandLuckyRollGate {
  const islandNumber = normalizeIslandNumber(options.islandNumber);
  const cycleIndex = normalizeCycleIndex(options.cycleIndex);
  const metadata = getIslandRunIslandMetadata(islandNumber);

  if (!options.featureEnabled || metadata.luckyRollTrigger !== 'pre_island') {
    return {
      status: 'not_required',
      isRequired: false,
      blocksIslandStart: false,
      islandNumber,
      cycleIndex,
      sessionKey: null,
      luckyRollSession: null,
    };
  }

  const sessionKey = getIslandRunLuckyRollSessionKey(cycleIndex, islandNumber);
  const luckyRollSession = options.luckyRollSessionsByMilestone?.[sessionKey] ?? null;
  let status: IslandRunPreIslandLuckyRollGateStatus;

  switch (luckyRollSession?.status) {
    case undefined:
      status = 'required_missing_session';
      break;
    case 'active':
      status = 'required_active';
      break;
    case 'completed':
      status = 'required_completed_unbanked';
      break;
    case 'banked':
      status = 'satisfied_banked';
      break;
    case 'expired':
      status = 'expired_or_blocked';
      break;
    default:
      status = 'expired_or_blocked';
      break;
  }

  return {
    status,
    isRequired: true,
    blocksIslandStart: BLOCKING_STATUSES.has(status),
    islandNumber,
    cycleIndex,
    sessionKey,
    luckyRollSession,
  };
}
