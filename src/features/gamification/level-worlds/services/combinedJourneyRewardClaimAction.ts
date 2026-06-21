import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isIslandRunFeatureEnabled } from '../../../../config/islandRunFeatureFlags';
import { withIslandRunActionLock } from './islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { commitIslandRunState } from './islandRunStateStore';
import {
  deriveCombinedJourneyLevel,
  type CombinedJourneyLevelInput,
} from './combinedJourneyLevel';
import { type JourneyChestReward, type JourneyRewardKind } from './combinedJourneyRewardLadder';

/**
 * Combined Journey Level — server-authoritative reward claim (R4).
 *
 * Claims a single threshold chest. Idempotency and reward resolution are owned by
 * the SQL RPC `claim_combined_journey_reward` (see migrations 0257/0258); this
 * action gates the unlock level, invokes the RPC, and applies the granted reward
 * to runtime state through the standard commit path. No reward kind/amount is
 * ever trusted from the caller.
 */

export type CombinedJourneyClaimStatus =
  | 'claimed'
  | 'already_claimed'
  | 'not_yet_unlocked'
  | 'disabled';

export interface ClaimCombinedJourneyRewardOptions {
  session: Session;
  client: SupabaseClient | null;
  thresholdLevel: number;
  /**
   * Real-life milestone inputs (completed goals, habit consistency, current
   * island progress). The game side (islands completed) is taken from the
   * trusted runtime record.
   */
  milestoneInputs?: CombinedJourneyLevelInput;
  triggerSource?: string;
}

export interface ClaimCombinedJourneyRewardResult {
  status: CombinedJourneyClaimStatus;
  reward: JourneyChestReward | null;
  record: IslandRunGameStateRecord;
}

type ClaimRpcRow = {
  claimed?: boolean | null;
  reward_kind?: string | null;
  reward_amount?: number | null;
};

function normalizeRpcRow(data: unknown): ClaimRpcRow | null {
  if (Array.isArray(data)) return (data[0] as ClaimRpcRow) ?? null;
  if (data && typeof data === 'object') return data as ClaimRpcRow;
  return null;
}

function parseReward(row: ClaimRpcRow | null): JourneyChestReward | null {
  if (!row || typeof row.reward_kind !== 'string') return null;
  const amount = typeof row.reward_amount === 'number' && Number.isFinite(row.reward_amount)
    ? Math.max(0, Math.floor(row.reward_amount))
    : 0;
  return { kind: row.reward_kind as JourneyRewardKind, amount };
}

/** Apply a granted reward to a runtime record. Currency rewards only (R4). */
function applyRewardToRecord(
  record: IslandRunGameStateRecord,
  reward: JourneyChestReward,
): IslandRunGameStateRecord {
  if (reward.amount <= 0) return record;
  if (reward.kind === 'dice') {
    return {
      ...record,
      dicePool: record.dicePool + reward.amount,
      runtimeVersion: record.runtimeVersion + 1,
    };
  }
  if (reward.kind === 'essence') {
    return {
      ...record,
      essence: record.essence + reward.amount,
      essenceLifetimeEarned: record.essenceLifetimeEarned + reward.amount,
      runtimeVersion: record.runtimeVersion + 1,
    };
  }
  // egg / reroll_capacity grants are wired in a later slice.
  return record;
}

export function claimCombinedJourneyReward(
  options: ClaimCombinedJourneyRewardOptions,
): Promise<ClaimCombinedJourneyRewardResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, thresholdLevel, milestoneInputs, triggerSource } = options;
    const current = readIslandRunGameStateRecord(session);

    // Reward claims require both the feature flag and a server connection (the
    // idempotency RPC is the only write path into the ledger).
    if (!isIslandRunFeatureEnabled('combinedJourneyRewardsEnabled') || !client) {
      return { status: 'disabled', reward: null, record: current };
    }

    const normalizedThreshold = Math.floor(thresholdLevel);
    if (!Number.isFinite(normalizedThreshold) || normalizedThreshold < 1) {
      return { status: 'not_yet_unlocked', reward: null, record: current };
    }

    // Unlock guard. Game side comes from the trusted runtime record; real-life
    // inputs come from the caller's already-loaded summaries.
    const summary = deriveCombinedJourneyLevel({
      ...milestoneInputs,
      islandsCompleted: Math.max(0, current.currentIslandNumber - 1),
    });
    if (normalizedThreshold > summary.level) {
      return { status: 'not_yet_unlocked', reward: null, record: current };
    }

    const { data, error } = await client.rpc('claim_combined_journey_reward', {
      p_threshold_level: normalizedThreshold,
    });
    if (error) {
      throw new Error(error.message);
    }

    const row = normalizeRpcRow(data);
    const reward = parseReward(row);
    const wasClaimed = Boolean(row?.claimed);

    if (!wasClaimed) {
      // Already claimed in a prior session/race — idempotent no-op, no grant.
      return { status: 'already_claimed', reward, record: current };
    }

    if (!reward) {
      // Defensive: claimed but no reward resolved. Treat as claimed, no grant.
      return { status: 'claimed', reward: null, record: current };
    }

    const next = applyRewardToRecord(current, reward);
    if (next !== current) {
      await commitIslandRunState({
        session,
        client,
        record: next,
        triggerSource: triggerSource ?? 'claim_combined_journey_reward',
      });
    }

    return { status: 'claimed', reward, record: next };
  });
}
