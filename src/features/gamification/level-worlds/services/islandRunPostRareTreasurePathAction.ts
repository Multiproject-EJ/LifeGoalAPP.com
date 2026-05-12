import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  getIslandRunLuckyRollSessionKey,
  type IslandRunGameStateRecord,
  type IslandRunLuckyRollSession,
} from './islandRunGameStateStore';
import { getTreasurePathMilestoneMetadata } from './islandRunIslandMetadata';
import {
  resolveIslandRunLuckyRollRewardBanking,
  startIslandRunLuckyRoll,
} from './islandRunLuckyRollAction';
import { withIslandRunActionLock } from './islandRunActionMutex';
import {
  commitIslandRunState,
  getIslandRunStateSnapshot,
} from './islandRunStateStore';
import {
  ISLAND_RUN_MAX_ISLAND,
  resolveIslandRunTravelState,
} from './islandRunStateActions';

export type PostRareTreasurePathStateStatus =
  | 'not_applicable'
  | 'available_to_start'
  | 'active'
  | 'completed_ready_to_collect'
  | 'collected_banked'
  | 'already_traveled';

export interface ResolvePostRareTreasurePathStateOptions {
  record: IslandRunGameStateRecord;
  completedIslandNumber: number;
  cycleIndex: number;
}

export interface ResolvePostRareTreasurePathStateResult {
  status: PostRareTreasurePathStateStatus;
  sessionKey: string | null;
  luckyRollSession: IslandRunLuckyRollSession | null;
  completedIslandNumber: number;
  cycleIndex: number;
  nextIslandNumber: number | null;
  nextCycleIndex: number | null;
}

export interface ResolvePendingTreasurePathResumeOptions {
  record: IslandRunGameStateRecord;
}

export type ResolvePendingTreasurePathResumeResult = ResolvePostRareTreasurePathStateResult | null;

const RESUMABLE_TREASURE_PATH_STATUSES = new Set<PostRareTreasurePathStateStatus>([
  'active',
  'completed_ready_to_collect',
  'collected_banked',
]);

export interface StartPostRareTreasurePathOptions {
  session: Session;
  client: SupabaseClient | null;
  completedIslandNumber: number;
  cycleIndex: number;
  nowMs?: number;
  runId?: string;
  triggerSource?: string;
}

export interface StartPostRareTreasurePathResult {
  status: 'started' | 'resumed' | 'not_applicable';
  state: ResolvePostRareTreasurePathStateResult;
  record: IslandRunGameStateRecord;
}

export interface CollectPostRareTreasurePathAndTravelOptions {
  session: Session;
  client: SupabaseClient | null;
  completedIslandNumber: number;
  cycleIndex: number;
  startTimer: boolean;
  nowMs: number;
  getIslandDurationMs: (islandNumber: number) => number;
  islandRunContractV2Enabled: boolean;
  triggerSource?: string;
}

export interface CollectPostRareTreasurePathAndTravelResult {
  status: 'banked_and_traveled' | 'already_traveled' | 'not_applicable' | 'not_found' | 'not_completed' | 'expired';
  record: IslandRunGameStateRecord;
  state: ResolvePostRareTreasurePathStateResult;
  diceAwarded: number;
  essenceAwarded: number;
  shardsAwarded: number;
}

function normalizeCycleIndex(cycleIndex: number): number {
  return Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex)) : 0;
}

function normalizeIslandNumber(islandNumber: number): number {
  return Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
}

function resolveNextIsland(completedIslandNumber: number, cycleIndex: number): {
  nextIslandNumber: number;
  nextCycleIndex: number;
} {
  const wraps = completedIslandNumber >= ISLAND_RUN_MAX_ISLAND;
  return {
    nextIslandNumber: wraps ? 1 : completedIslandNumber + 1,
    nextCycleIndex: wraps ? cycleIndex + 1 : cycleIndex,
  };
}

function isRecordAtIsland(record: IslandRunGameStateRecord, islandNumber: number, cycleIndex: number): boolean {
  return record.currentIslandNumber === islandNumber && record.cycleIndex === cycleIndex;
}

function createNoRewardCollectResult(
  status: Exclude<CollectPostRareTreasurePathAndTravelResult['status'], 'banked_and_traveled'>,
  record: IslandRunGameStateRecord,
  state: ResolvePostRareTreasurePathStateResult,
): CollectPostRareTreasurePathAndTravelResult {
  return { status, record, state, diceAwarded: 0, essenceAwarded: 0, shardsAwarded: 0 };
}

export function resolvePostRareTreasurePathState(
  options: ResolvePostRareTreasurePathStateOptions,
): ResolvePostRareTreasurePathStateResult {
  const completedIslandNumber = normalizeIslandNumber(options.completedIslandNumber);
  const cycleIndex = normalizeCycleIndex(options.cycleIndex);
  const metadata = getTreasurePathMilestoneMetadata(completedIslandNumber);
  if (!metadata) {
    return {
      status: 'not_applicable',
      sessionKey: null,
      luckyRollSession: null,
      completedIslandNumber,
      cycleIndex,
      nextIslandNumber: null,
      nextCycleIndex: null,
    };
  }

  const { nextIslandNumber, nextCycleIndex } = resolveNextIsland(completedIslandNumber, cycleIndex);
  const sessionKey = getIslandRunLuckyRollSessionKey(cycleIndex, completedIslandNumber);
  const luckyRollSession = options.record.luckyRollSessionsByMilestone[sessionKey] ?? null;
  const alreadyTraveled = isRecordAtIsland(options.record, nextIslandNumber, nextCycleIndex);

  if (!luckyRollSession) {
    return {
      status: alreadyTraveled ? 'already_traveled' : 'available_to_start',
      sessionKey,
      luckyRollSession: null,
      completedIslandNumber,
      cycleIndex,
      nextIslandNumber,
      nextCycleIndex,
    };
  }

  const status: PostRareTreasurePathStateStatus = luckyRollSession.status === 'banked'
    ? (alreadyTraveled ? 'already_traveled' : 'collected_banked')
    : luckyRollSession.status === 'completed'
      ? 'completed_ready_to_collect'
      : luckyRollSession.status === 'active'
        ? 'active'
        : 'not_applicable';

  return {
    status,
    sessionKey,
    luckyRollSession,
    completedIslandNumber,
    cycleIndex,
    nextIslandNumber,
    nextCycleIndex,
  };
}

function getResumeStatusPriority(status: PostRareTreasurePathStateStatus): number {
  switch (status) {
    case 'completed_ready_to_collect':
      return 3;
    case 'collected_banked':
      return 2;
    case 'active':
      return 1;
    default:
      return 0;
  }
}

export function resolvePendingTreasurePathResume(
  options: ResolvePendingTreasurePathResumeOptions,
): ResolvePendingTreasurePathResumeResult {
  const candidates = Object.entries(options.record.luckyRollSessionsByMilestone)
    .map(([sessionKey, luckyRollSession]) => {
      const state = resolvePostRareTreasurePathState({
        record: options.record,
        completedIslandNumber: luckyRollSession.targetIslandNumber,
        cycleIndex: luckyRollSession.cycleIndex,
      });
      return state.sessionKey === sessionKey ? state : null;
    })
    .filter((state): state is ResolvePostRareTreasurePathStateResult => {
      if (!state) return false;
      if (!RESUMABLE_TREASURE_PATH_STATUSES.has(state.status)) return false;
      return isRecordAtIsland(options.record, state.completedIslandNumber, state.cycleIndex);
    });

  if (candidates.length < 1) return null;

  return candidates.sort((a, b) => {
    const priorityDelta = getResumeStatusPriority(b.status) - getResumeStatusPriority(a.status);
    if (priorityDelta !== 0) return priorityDelta;
    const updatedDelta = (b.luckyRollSession?.updatedAtMs ?? 0) - (a.luckyRollSession?.updatedAtMs ?? 0);
    if (updatedDelta !== 0) return updatedDelta;
    return b.completedIslandNumber - a.completedIslandNumber;
  })[0];
}

export async function startPostRareTreasurePath(
  options: StartPostRareTreasurePathOptions,
): Promise<StartPostRareTreasurePathResult> {
  const initialState = resolvePostRareTreasurePathState({
    record: getIslandRunStateSnapshot(options.session),
    completedIslandNumber: options.completedIslandNumber,
    cycleIndex: options.cycleIndex,
  });
  if (initialState.status === 'not_applicable') {
    return { status: 'not_applicable', state: initialState, record: getIslandRunStateSnapshot(options.session) };
  }
  if (initialState.status !== 'available_to_start' && !initialState.luckyRollSession) {
    return { status: 'not_applicable', state: initialState, record: getIslandRunStateSnapshot(options.session) };
  }
  if (initialState.luckyRollSession) {
    return { status: 'resumed', state: initialState, record: getIslandRunStateSnapshot(options.session) };
  }

  const started = await startIslandRunLuckyRoll({
    session: options.session,
    client: options.client,
    cycleIndex: initialState.cycleIndex,
    targetIslandNumber: initialState.completedIslandNumber,
    nowMs: options.nowMs,
    runId: options.runId,
    triggerSource: options.triggerSource ?? 'start_post_rare_treasure_path',
  });
  const state = resolvePostRareTreasurePathState({
    record: started.record,
    completedIslandNumber: initialState.completedIslandNumber,
    cycleIndex: initialState.cycleIndex,
  });
  return {
    status: started.status === 'started' ? 'started' : 'resumed',
    state,
    record: started.record,
  };
}

export function collectPostRareTreasurePathAndTravel(
  options: CollectPostRareTreasurePathAndTravelOptions,
): Promise<CollectPostRareTreasurePathAndTravelResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const current = getIslandRunStateSnapshot(options.session);
    const state = resolvePostRareTreasurePathState({
      record: current,
      completedIslandNumber: options.completedIslandNumber,
      cycleIndex: options.cycleIndex,
    });
    if (state.luckyRollSession?.status === 'expired') {
      return createNoRewardCollectResult('expired', current, state);
    }
    if (state.status === 'not_applicable') {
      return createNoRewardCollectResult('not_applicable', current, state);
    }
    if (state.status === 'already_traveled') {
      return createNoRewardCollectResult('already_traveled', current, state);
    }
    if (!state.luckyRollSession) {
      return createNoRewardCollectResult('not_found', current, state);
    }
    if (state.luckyRollSession.status === 'active') {
      return createNoRewardCollectResult('not_completed', current, state);
    }

    const banking = state.luckyRollSession.status === 'banked'
      ? {
          status: 'already_banked' as const,
          record: current,
          diceAwarded: 0,
          essenceAwarded: 0,
          shardsAwarded: 0,
        }
      : resolveIslandRunLuckyRollRewardBanking({
          record: current,
          cycleIndex: state.cycleIndex,
          targetIslandNumber: state.completedIslandNumber,
          nowMs: options.nowMs,
          bumpRuntimeVersion: false,
        });
    if (banking.status === 'not_found') {
      return createNoRewardCollectResult('not_found', current, state);
    }
    if (banking.status === 'expired') {
      return createNoRewardCollectResult('expired', current, state);
    }

    const justBanked = banking.status === 'banked';
    const bankedRecord = banking.record;
    const travel = resolveIslandRunTravelState({
      current: bankedRecord,
      nextIsland: state.completedIslandNumber + 1,
      startTimer: options.startTimer,
      nowMs: options.nowMs,
      getIslandDurationMs: options.getIslandDurationMs,
      islandRunContractV2Enabled: options.islandRunContractV2Enabled,
    });
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: travel.record,
      triggerSource: options.triggerSource ?? 'collect_post_rare_treasure_path_and_travel',
    });
    const nextState = resolvePostRareTreasurePathState({
      record: travel.record,
      completedIslandNumber: state.completedIslandNumber,
      cycleIndex: state.cycleIndex,
    });
    return {
      status: 'banked_and_traveled',
      record: travel.record,
      state: nextState,
      diceAwarded: justBanked ? banking.diceAwarded : 0,
      essenceAwarded: justBanked ? banking.essenceAwarded : 0,
      shardsAwarded: justBanked ? banking.shardsAwarded : 0,
    };
  });
}
