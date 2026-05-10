/**
 * islandRunLuckyRollAction — canonical Island Run Lucky Roll session actions.
 *
 * This service owns pre-island Lucky Roll session state only. It does not launch
 * UI, change island travel, consume legacy Lucky Roll access, or touch legacy
 * gameRewards/localStorage Lucky Roll state.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  getIslandRunLuckyRollSessionKey,
  readIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
  type IslandRunLuckyRollRewardEntry,
  type IslandRunLuckyRollSession,
} from './islandRunGameStateStore';
import { commitIslandRunState } from './islandRunStateStore';
import { withIslandRunActionLock } from './islandRunActionMutex';

const DEFAULT_LUCKY_ROLL_BOARD_SIZE = 30;

export type IslandRunLuckyRollV1RewardType = 'dice' | 'essence';

export interface IslandRunLuckyRollRewardInput {
  rewardType: IslandRunLuckyRollV1RewardType;
  amount: number;
  rewardId?: string;
  metadata?: Record<string, unknown>;
}

export interface StartIslandRunLuckyRollOptions {
  session: Session;
  client: SupabaseClient | null;
  cycleIndex: number;
  targetIslandNumber: number;
  nowMs?: number;
  runId?: string;
  triggerSource?: string;
}

export interface StartIslandRunLuckyRollResult {
  status: 'started' | 'already_exists';
  record: IslandRunGameStateRecord;
  sessionKey: string;
  luckyRollSession: IslandRunLuckyRollSession;
}

export interface AdvanceIslandRunLuckyRollOptions {
  session: Session;
  client: SupabaseClient | null;
  cycleIndex: number;
  targetIslandNumber: number;
  roll: number;
  reward?: IslandRunLuckyRollRewardInput | null;
  boardSize?: number;
  nowMs?: number;
  triggerSource?: string;
}

export interface AdvanceIslandRunLuckyRollResult {
  status: 'advanced' | 'completed' | 'not_found' | 'not_active';
  record: IslandRunGameStateRecord;
  sessionKey: string;
  luckyRollSession: IslandRunLuckyRollSession | null;
  roll: number;
  landedTileId: number | null;
  rewardAdded: boolean;
}

export interface BankIslandRunLuckyRollRewardsOptions {
  session: Session;
  client: SupabaseClient | null;
  cycleIndex: number;
  targetIslandNumber: number;
  nowMs?: number;
  triggerSource?: string;
}

export interface BankIslandRunLuckyRollRewardsResult {
  status: 'banked' | 'already_banked' | 'not_found' | 'expired';
  record: IslandRunGameStateRecord;
  sessionKey: string;
  luckyRollSession: IslandRunLuckyRollSession | null;
  rewardsBanked: IslandRunLuckyRollRewardEntry[];
  diceAwarded: number;
  essenceAwarded: number;
}

export interface ExpireIslandRunLuckyRollOptions {
  session: Session;
  client: SupabaseClient | null;
  cycleIndex: number;
  targetIslandNumber: number;
  nowMs?: number;
  triggerSource?: string;
}

export interface ExpireIslandRunLuckyRollResult {
  status: 'expired' | 'already_banked' | 'already_expired' | 'not_found';
  record: IslandRunGameStateRecord;
  sessionKey: string;
  luckyRollSession: IslandRunLuckyRollSession | null;
}

function normalizeCycleIndex(cycleIndex: number): number {
  return Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex)) : 0;
}

function normalizeTargetIslandNumber(targetIslandNumber: number): number {
  return Number.isFinite(targetIslandNumber) ? Math.max(1, Math.floor(targetIslandNumber)) : 1;
}

function normalizeNowMs(nowMs: number | undefined): number {
  if (!Number.isFinite(nowMs)) return Date.now();
  return Math.max(0, Math.floor(nowMs as number));
}

function normalizeRoll(roll: number): number {
  return Number.isFinite(roll) ? Math.min(6, Math.max(1, Math.floor(roll))) : 1;
}

function normalizeBoardSize(boardSize: number | undefined): number {
  if (!Number.isFinite(boardSize)) return DEFAULT_LUCKY_ROLL_BOARD_SIZE;
  return Math.max(2, Math.floor(boardSize as number));
}

function buildRunId(sessionKey: string, nowMs: number): string {
  const randomSuffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `island-run-lucky-roll:${sessionKey}:${nowMs}:${randomSuffix}`;
}

function buildRewardEntry(
  sessionKey: string,
  tileId: number,
  reward: IslandRunLuckyRollRewardInput | null | undefined,
): IslandRunLuckyRollRewardEntry | null {
  if (!reward) return null;
  const amount = Number.isFinite(reward.amount) ? Math.max(0, Math.floor(reward.amount)) : 0;
  if (amount < 1) return null;
  const rewardType = reward.rewardType === 'dice' || reward.rewardType === 'essence' ? reward.rewardType : null;
  if (!rewardType) return null;
  const normalizedRewardId = typeof reward.rewardId === 'string' && reward.rewardId.trim().length > 0
    ? reward.rewardId.trim()
    : `${sessionKey}:${tileId}:${rewardType}`;
  return {
    rewardId: normalizedRewardId,
    tileId,
    rewardType,
    amount,
    ...(reward.metadata ? { metadata: reward.metadata } : {}),
  };
}

function sortUniqueTileIds(tileIds: number[]): number[] {
  return Array.from(new Set(tileIds.map((tileId) => Math.max(0, Math.floor(tileId))))).sort((a, b) => a - b);
}

function getSessionContext(cycleIndex: number, targetIslandNumber: number): {
  cycleIndex: number;
  targetIslandNumber: number;
  sessionKey: string;
} {
  const normalizedCycleIndex = normalizeCycleIndex(cycleIndex);
  const normalizedTargetIslandNumber = normalizeTargetIslandNumber(targetIslandNumber);
  return {
    cycleIndex: normalizedCycleIndex,
    targetIslandNumber: normalizedTargetIslandNumber,
    sessionKey: getIslandRunLuckyRollSessionKey(normalizedCycleIndex, normalizedTargetIslandNumber),
  };
}

async function commitLuckyRollRecord(options: {
  session: Session;
  client: SupabaseClient | null;
  record: IslandRunGameStateRecord;
  triggerSource: string;
}): Promise<void> {
  await commitIslandRunState(options);
}

export function startIslandRunLuckyRoll(
  options: StartIslandRunLuckyRollOptions,
): Promise<StartIslandRunLuckyRollResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, triggerSource } = options;
    const nowMs = normalizeNowMs(options.nowMs);
    const { cycleIndex, targetIslandNumber, sessionKey } = getSessionContext(options.cycleIndex, options.targetIslandNumber);
    const current = readIslandRunGameStateRecord(session);
    const existing = current.luckyRollSessionsByMilestone[sessionKey];
    if (existing) {
      return {
        status: 'already_exists',
        record: current,
        sessionKey,
        luckyRollSession: existing,
      };
    }

    const luckyRollSession: IslandRunLuckyRollSession = {
      status: 'active',
      runId: typeof options.runId === 'string' && options.runId.trim().length > 0
        ? options.runId.trim()
        : buildRunId(sessionKey, nowMs),
      targetIslandNumber,
      cycleIndex,
      position: 0,
      rollsUsed: 0,
      claimedTileIds: [],
      pendingRewards: [],
      bankedRewards: [],
      startedAtMs: nowMs,
      bankedAtMs: null,
      updatedAtMs: nowMs,
    };

    const next: IslandRunGameStateRecord = {
      ...current,
      luckyRollSessionsByMilestone: {
        ...current.luckyRollSessionsByMilestone,
        [sessionKey]: luckyRollSession,
      },
      runtimeVersion: current.runtimeVersion + 1,
    };

    await commitLuckyRollRecord({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'start_island_run_lucky_roll',
    });

    return {
      status: 'started',
      record: next,
      sessionKey,
      luckyRollSession,
    };
  });
}

export function advanceIslandRunLuckyRoll(
  options: AdvanceIslandRunLuckyRollOptions,
): Promise<AdvanceIslandRunLuckyRollResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, triggerSource } = options;
    const nowMs = normalizeNowMs(options.nowMs);
    const roll = normalizeRoll(options.roll);
    const boardSize = normalizeBoardSize(options.boardSize);
    const finishTileId = boardSize - 1;
    const { sessionKey } = getSessionContext(options.cycleIndex, options.targetIslandNumber);
    const current = readIslandRunGameStateRecord(session);
    const luckyRollSession = current.luckyRollSessionsByMilestone[sessionKey] ?? null;
    if (!luckyRollSession) {
      return { status: 'not_found', record: current, sessionKey, luckyRollSession: null, roll, landedTileId: null, rewardAdded: false };
    }
    if (luckyRollSession.status !== 'active') {
      return { status: 'not_active', record: current, sessionKey, luckyRollSession, roll, landedTileId: null, rewardAdded: false };
    }

    const landedTileId = Math.min(finishTileId, Math.max(0, luckyRollSession.position + roll));
    const alreadyClaimedTile = luckyRollSession.claimedTileIds.includes(landedTileId);
    const pendingReward = alreadyClaimedTile ? null : buildRewardEntry(sessionKey, landedTileId, options.reward);
    const existingRewardIds = new Set([
      ...luckyRollSession.pendingRewards.map((entry) => entry.rewardId),
      ...luckyRollSession.bankedRewards.map((entry) => entry.rewardId),
    ]);
    const rewardAdded = Boolean(pendingReward && !existingRewardIds.has(pendingReward.rewardId));
    const nextStatus = landedTileId >= finishTileId ? 'completed' : 'active';
    const nextLuckyRollSession: IslandRunLuckyRollSession = {
      ...luckyRollSession,
      status: nextStatus,
      position: landedTileId,
      rollsUsed: luckyRollSession.rollsUsed + 1,
      claimedTileIds: pendingReward
        ? sortUniqueTileIds([...luckyRollSession.claimedTileIds, landedTileId])
        : luckyRollSession.claimedTileIds,
      pendingRewards: rewardAdded
        ? [...luckyRollSession.pendingRewards, pendingReward as IslandRunLuckyRollRewardEntry]
        : luckyRollSession.pendingRewards,
      updatedAtMs: nowMs,
    };
    const next: IslandRunGameStateRecord = {
      ...current,
      luckyRollSessionsByMilestone: {
        ...current.luckyRollSessionsByMilestone,
        [sessionKey]: nextLuckyRollSession,
      },
      runtimeVersion: current.runtimeVersion + 1,
    };

    await commitLuckyRollRecord({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'advance_island_run_lucky_roll',
    });

    return {
      status: nextStatus === 'completed' ? 'completed' : 'advanced',
      record: next,
      sessionKey,
      luckyRollSession: nextLuckyRollSession,
      roll,
      landedTileId,
      rewardAdded,
    };
  });
}

export function bankIslandRunLuckyRollRewards(
  options: BankIslandRunLuckyRollRewardsOptions,
): Promise<BankIslandRunLuckyRollRewardsResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, triggerSource } = options;
    const nowMs = normalizeNowMs(options.nowMs);
    const { sessionKey } = getSessionContext(options.cycleIndex, options.targetIslandNumber);
    const current = readIslandRunGameStateRecord(session);
    const luckyRollSession = current.luckyRollSessionsByMilestone[sessionKey] ?? null;
    if (!luckyRollSession) {
      return { status: 'not_found', record: current, sessionKey, luckyRollSession: null, rewardsBanked: [], diceAwarded: 0, essenceAwarded: 0 };
    }
    if (luckyRollSession.status === 'banked') {
      return { status: 'already_banked', record: current, sessionKey, luckyRollSession, rewardsBanked: [], diceAwarded: 0, essenceAwarded: 0 };
    }
    if (luckyRollSession.status === 'expired') {
      return { status: 'expired', record: current, sessionKey, luckyRollSession, rewardsBanked: [], diceAwarded: 0, essenceAwarded: 0 };
    }

    const bankedRewardIds = new Set(luckyRollSession.bankedRewards.map((entry) => entry.rewardId));
    const rewardsToBank = luckyRollSession.pendingRewards.filter((entry) => !bankedRewardIds.has(entry.rewardId));
    const diceAwarded = rewardsToBank
      .filter((entry) => entry.rewardType === 'dice')
      .reduce((total, entry) => total + Math.max(0, Math.floor(entry.amount)), 0);
    const essenceAwarded = rewardsToBank
      .filter((entry) => entry.rewardType === 'essence')
      .reduce((total, entry) => total + Math.max(0, Math.floor(entry.amount)), 0);
    const nextLuckyRollSession: IslandRunLuckyRollSession = {
      ...luckyRollSession,
      status: 'banked',
      pendingRewards: [],
      bankedRewards: [...luckyRollSession.bankedRewards, ...rewardsToBank],
      bankedAtMs: luckyRollSession.bankedAtMs ?? nowMs,
      updatedAtMs: nowMs,
    };
    const next: IslandRunGameStateRecord = {
      ...current,
      dicePool: current.dicePool + diceAwarded,
      essence: current.essence + essenceAwarded,
      essenceLifetimeEarned: current.essenceLifetimeEarned + essenceAwarded,
      luckyRollSessionsByMilestone: {
        ...current.luckyRollSessionsByMilestone,
        [sessionKey]: nextLuckyRollSession,
      },
      runtimeVersion: current.runtimeVersion + 1,
    };

    await commitLuckyRollRecord({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'bank_island_run_lucky_roll_rewards',
    });

    return {
      status: 'banked',
      record: next,
      sessionKey,
      luckyRollSession: nextLuckyRollSession,
      rewardsBanked: rewardsToBank,
      diceAwarded,
      essenceAwarded,
    };
  });
}

export function expireIslandRunLuckyRoll(
  options: ExpireIslandRunLuckyRollOptions,
): Promise<ExpireIslandRunLuckyRollResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, triggerSource } = options;
    const nowMs = normalizeNowMs(options.nowMs);
    const { sessionKey } = getSessionContext(options.cycleIndex, options.targetIslandNumber);
    const current = readIslandRunGameStateRecord(session);
    const luckyRollSession = current.luckyRollSessionsByMilestone[sessionKey] ?? null;
    if (!luckyRollSession) {
      return { status: 'not_found', record: current, sessionKey, luckyRollSession: null };
    }
    if (luckyRollSession.status === 'banked') {
      return { status: 'already_banked', record: current, sessionKey, luckyRollSession };
    }
    if (luckyRollSession.status === 'expired') {
      return { status: 'already_expired', record: current, sessionKey, luckyRollSession };
    }

    const nextLuckyRollSession: IslandRunLuckyRollSession = {
      ...luckyRollSession,
      status: 'expired',
      updatedAtMs: nowMs,
    };
    const next: IslandRunGameStateRecord = {
      ...current,
      luckyRollSessionsByMilestone: {
        ...current.luckyRollSessionsByMilestone,
        [sessionKey]: nextLuckyRollSession,
      },
      runtimeVersion: current.runtimeVersion + 1,
    };

    await commitLuckyRollRecord({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'expire_island_run_lucky_roll',
    });

    return {
      status: 'expired',
      record: next,
      sessionKey,
      luckyRollSession: nextLuckyRollSession,
    };
  });
}
