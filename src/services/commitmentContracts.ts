import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { listHabitLogsForRangeV2 } from './habitsV2';
import { fetchGoals } from './goals';
import type {
  CommitmentContract,
  ContractEvaluation,
  ContractStatus,
  ContractTargetType,
  ContractCadence,
  ContractStakeType,
  ContractType,
  ContractTier,
  ContractStage,
  ReputationScore,
  ReputationTier,
  ContractTrackingMode,
} from '../types/gamification';
import { DEMO_REPUTATION_KEY } from '../types/gamification';
import { recordTelemetryEvent, type TelemetryEventMetadata } from './telemetry';
import {
  getContractRewardMultiplier,
  getSuccessStreakFromEvaluations,
} from '../lib/contractRewardMultipliers';
import {
  checkSameContractCooldown,
  checkSacredContractLimit,
} from '../lib/contractIntegrity';
import { checkContractZenGardenRewards } from './contractZenGardenRewards';

// Maximum number of simultaneously active contracts
export const MAX_ACTIVE_CONTRACTS = 3;

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

export type ReduceStakeEligibility = {
  eligible: boolean;
  missesLast30Days: number;
  reason?: string;
  nextEligibleAt?: string;
};

export type GentleRecoveryEligibility = {
  eligible: boolean;
  reason?: string;
};

export type ResetContractEligibility = {
  eligible: boolean;
  reason?: string;
  nextEligibleAt?: string;
};

export type ContractInput = {
  title: string;
  targetType: ContractTargetType;
  targetId: string;
  cadence: ContractCadence;
  targetCount: number;
  stakeType: ContractStakeType;
  stakeAmount: number;
  graceDays?: number;
  coolingOffHours?: number;
  accountabilityMode?: 'solo' | 'witness';
  witnessLabel?: string;
  startAt?: string;
  endAt?: string | null;
  // New contract type fields
  contractType?: ContractType;
  trackingMode?: ContractTrackingMode;
  identityStatement?: string | null;
  redemptionQuestTitle?: string | null;
  futureMessage?: string | null;
  narrativeTheme?: 'warrior' | 'monk' | 'scholar' | 'explorer' | null;
  isSacred?: boolean;
  stages?: ContractStage[] | null;
  unlocksContractId?: string | null;
  unlockedByContractId?: string | null;
};

export type ContractSweepHealth = {
  status: 'running' | 'success' | 'partial' | 'failed';
  triggeredAt: string;
  finishedAt: string | null;
  usersProcessed: number;
  evaluationsCreated: number;
  failedUsers: number;
};

const CONTRACTS_STORAGE_KEY = 'lifegoal_contracts';
const EVALUATIONS_STORAGE_KEY = 'lifegoal_contract_evaluations';

function getContractsKey(userId: string) {
  return `${CONTRACTS_STORAGE_KEY}_${userId}`;
}

function getEvaluationsKey(userId: string) {
  return `${EVALUATIONS_STORAGE_KEY}_${userId}`;
}

type ContractRow = {
  id: string;
  user_id: string;
  title: string;
  target_type: ContractTargetType;
  target_id: string;
  cadence: ContractCadence;
  target_count: number;
  stake_type: ContractStakeType;
  stake_amount: number;
  grace_days: number;
  cooling_off_hours: number;
  status: ContractStatus;
  tracking_mode: ContractTrackingMode;
  current_progress: number;
  self_reported_outcome: 'success' | 'miss' | null;
  miss_count: number;
  success_count: number;
  reset_count: number;
  last_reset_at: string | null;
  stake_reduced_at: string | null;
  recovery_mode: 'gentle_ramp' | null;
  recovery_original_target_count: number | null;
  recovery_activated_at: string | null;
  accountability_mode: 'solo' | 'witness' | null;
  witness_label: string | null;
  start_at: string;
  end_at: string | null;
  current_window_start: string;
  last_evaluated_at: string | null;
  created_at: string;
  updated_at: string;
  // New contract type fields
  contract_type: ContractType;
  contract_tier: ContractTier;
  identity_statement: string | null;
  escalation_level: number;
  escalation_multiplier: number;
  base_stake_amount: number | null;
  redemption_quest_id: string | null;
  redemption_quest_title: string | null;
  redemption_quest_completed: boolean;
  future_message: string | null;
  future_message_unlocked_at: string | null;
  narrative_theme: 'warrior' | 'monk' | 'scholar' | 'explorer' | null;
  narrative_rank: number;
  is_sacred: boolean;
  sacred_penalty_multiplier: number;
  stages: ContractStage[] | null;
  current_stage_index: number;
  unlocks_contract_id: string | null;
  unlocked_by_contract_id: string | null;
  reliability_score_impact: number;
};

type EvaluationRow = {
  id: string;
  contract_id: string;
  user_id: string;
  window_start: string;
  window_end: string;
  target_count: number;
  actual_count: number;
  grace_days_used: number;
  result: 'success' | 'miss';
  stake_forfeited: number;
  bonus_awarded: number;
  evaluated_at: string;
  created_at: string;
};

type ContractSweepRunRow = {
  status: 'running' | 'success' | 'partial' | 'failed';
  triggered_at: string;
  finished_at: string | null;
  users_processed: number;
  evaluations_created: number;
  failed_users: number;
};

function contractFromRow(row: ContractRow): CommitmentContract {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    targetType: row.target_type,
    targetId: row.target_id,
    cadence: row.cadence,
    targetCount: row.target_count,
    stakeType: row.stake_type,
    stakeAmount: row.stake_amount,
    graceDays: row.grace_days,
    coolingOffHours: row.cooling_off_hours,
    status: row.status,
    trackingMode: row.tracking_mode ?? 'progress',
    currentProgress: row.current_progress,
    selfReportedOutcome: row.self_reported_outcome ?? null,
    missCount: row.miss_count,
    successCount: row.success_count,
    resetCount: row.reset_count,
    lastResetAt: row.last_reset_at,
    stakeReducedAt: row.stake_reduced_at,
    recoveryMode: row.recovery_mode,
    recoveryOriginalTargetCount: row.recovery_original_target_count,
    recoveryActivatedAt: row.recovery_activated_at,
    accountabilityMode: row.accountability_mode,
    witnessLabel: row.witness_label,
    startAt: row.start_at,
    endAt: row.end_at,
    currentWindowStart: row.current_window_start,
    lastEvaluatedAt: row.last_evaluated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contractType: row.contract_type ?? 'classic',
    contractTier: row.contract_tier ?? 'common',
    identityStatement: row.identity_statement,
    escalationLevel: row.escalation_level ?? 0,
    escalationMultiplier: row.escalation_multiplier ?? 1.0,
    baseStakeAmount: row.base_stake_amount ?? undefined,
    redemptionQuestId: row.redemption_quest_id,
    redemptionQuestTitle: row.redemption_quest_title,
    redemptionQuestCompleted: row.redemption_quest_completed ?? false,
    futureMessage: row.future_message,
    futureMessageUnlockedAt: row.future_message_unlocked_at,
    narrativeTheme: row.narrative_theme,
    narrativeRank: row.narrative_rank ?? 0,
    isSacred: row.is_sacred ?? false,
    sacredPenaltyMultiplier: row.sacred_penalty_multiplier ?? 1.0,
    stages: row.stages,
    currentStageIndex: row.current_stage_index ?? 0,
    unlocksContractId: row.unlocks_contract_id,
    unlockedByContractId: row.unlocked_by_contract_id,
    reliabilityScoreImpact: row.reliability_score_impact ?? 1.0,
  };
}

function contractToRow(contract: CommitmentContract): ContractRow {
  return {
    id: contract.id,
    user_id: contract.userId,
    title: contract.title,
    target_type: contract.targetType,
    target_id: contract.targetId,
    cadence: contract.cadence,
    target_count: contract.targetCount,
    stake_type: contract.stakeType,
    stake_amount: contract.stakeAmount,
    grace_days: contract.graceDays,
    cooling_off_hours: contract.coolingOffHours,
    status: contract.status,
    tracking_mode: contract.trackingMode ?? 'progress',
    current_progress: contract.currentProgress,
    self_reported_outcome: contract.selfReportedOutcome ?? null,
    miss_count: contract.missCount,
    success_count: contract.successCount,
    reset_count: contract.resetCount ?? 0,
    last_reset_at: contract.lastResetAt ?? null,
    stake_reduced_at: contract.stakeReducedAt ?? null,
    recovery_mode: contract.recoveryMode ?? null,
    recovery_original_target_count: contract.recoveryOriginalTargetCount ?? null,
    recovery_activated_at: contract.recoveryActivatedAt ?? null,
    accountability_mode: contract.accountabilityMode ?? null,
    witness_label: contract.witnessLabel ?? null,
    start_at: contract.startAt,
    end_at: contract.endAt,
    current_window_start: contract.currentWindowStart,
    last_evaluated_at: contract.lastEvaluatedAt,
    created_at: contract.createdAt,
    updated_at: contract.updatedAt,
    contract_type: contract.contractType ?? 'classic',
    contract_tier: contract.contractTier ?? 'common',
    identity_statement: contract.identityStatement ?? null,
    escalation_level: contract.escalationLevel ?? 0,
    escalation_multiplier: contract.escalationMultiplier ?? 1.0,
    base_stake_amount: contract.baseStakeAmount ?? null,
    redemption_quest_id: contract.redemptionQuestId ?? null,
    redemption_quest_title: contract.redemptionQuestTitle ?? null,
    redemption_quest_completed: contract.redemptionQuestCompleted ?? false,
    future_message: contract.futureMessage ?? null,
    future_message_unlocked_at: contract.futureMessageUnlockedAt ?? null,
    narrative_theme: contract.narrativeTheme ?? null,
    narrative_rank: contract.narrativeRank ?? 0,
    is_sacred: contract.isSacred ?? false,
    sacred_penalty_multiplier: contract.sacredPenaltyMultiplier ?? 1.0,
    stages: contract.stages ?? null,
    current_stage_index: contract.currentStageIndex ?? 0,
    unlocks_contract_id: contract.unlocksContractId ?? null,
    unlocked_by_contract_id: contract.unlockedByContractId ?? null,
    reliability_score_impact: contract.reliabilityScoreImpact ?? 1.0,
  };
}

function evaluationFromRow(row: EvaluationRow): ContractEvaluation {
  return {
    id: row.id,
    contractId: row.contract_id,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    targetCount: row.target_count,
    actualCount: row.actual_count,
    graceDaysUsed: row.grace_days_used,
    result: row.result,
    stakeForfeited: row.stake_forfeited,
    bonusAwarded: row.bonus_awarded,
    evaluatedAt: row.evaluated_at,
  };
}

function evaluationToRow(userId: string, evaluation: ContractEvaluation): EvaluationRow {
  return {
    id: evaluation.id,
    contract_id: evaluation.contractId,
    user_id: userId,
    window_start: evaluation.windowStart,
    window_end: evaluation.windowEnd,
    target_count: evaluation.targetCount,
    actual_count: evaluation.actualCount,
    grace_days_used: evaluation.graceDaysUsed,
    result: evaluation.result,
    stake_forfeited: evaluation.stakeForfeited,
    bonus_awarded: evaluation.bonusAwarded,
    evaluated_at: evaluation.evaluatedAt,
    created_at: evaluation.evaluatedAt,
  };
}

async function saveContracts(userId: string, contracts: CommitmentContract[]): Promise<void> {
  if (!canUseSupabaseData()) {
    localStorage.setItem(getContractsKey(userId), JSON.stringify(contracts));
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('commitment_contracts')
    .upsert(contracts.map(contractToRow), { onConflict: 'id' });

  if (error) throw error;
}

async function saveEvaluations(userId: string, evaluations: ContractEvaluation[]): Promise<void> {
  if (!canUseSupabaseData()) {
    localStorage.setItem(getEvaluationsKey(userId), JSON.stringify(evaluations));
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('commitment_contract_evaluations')
    .upsert(evaluations.map((evaluation) => evaluationToRow(userId, evaluation)), { onConflict: 'id' });

  if (error) throw error;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${random}`;
}

function getWindowStart(cadence: ContractCadence, referenceDate: Date = new Date()): Date {
  const date = new Date(referenceDate);
  
  if (cadence === 'daily') {
    // Start of current day
    date.setHours(0, 0, 0, 0);
  } else {
    // Start of current week (Monday)
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday=0
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
  }
  
  return date;
}

function getWindowEnd(windowStart: Date, cadence: ContractCadence): Date {
  const date = new Date(windowStart);
  
  if (cadence === 'daily') {
    // End of day
    date.setHours(23, 59, 59, 999);
  } else {
    // End of week (Sunday)
    date.setDate(date.getDate() + 6);
    date.setHours(23, 59, 59, 999);
  }
  
  return date;
}

function toIsoDate(value: Date): string {
  return value.toISOString().split('T')[0];
}

async function getVerifiedProgressCount(userId: string, contract: CommitmentContract): Promise<number | null> {
  const windowStart = new Date(contract.currentWindowStart);
  const windowEnd = getWindowEnd(windowStart, contract.cadence);

  if (contract.targetType === 'Habit') {
    const { data: logs, error } = await listHabitLogsForRangeV2({
      userId,
      habitId: contract.targetId,
      startDate: toIsoDate(windowStart),
      endDate: toIsoDate(windowEnd),
    });

    if (error || !logs) {
      return null;
    }

    return logs.length;
  }

  if (contract.targetType === 'Goal') {
    const { data: goals, error } = await fetchGoals();
    if (error || !goals) {
      return null;
    }

    const matchingGoal = goals.find((goal) => goal.id === contract.targetId);
    if (!matchingGoal || matchingGoal.status_tag !== 'achieved') {
      return 0;
    }

    if (contract.cadence === 'daily') {
      return 1;
    }

    const achievedAt = new Date(matchingGoal.created_at ?? new Date().toISOString());
    return achievedAt >= windowStart && achievedAt <= windowEnd ? 1 : 0;
  }

  if (contract.targetType === 'FocusSession') {
    // TODO: Wire FocusSession progress once a focus session service is available.
    // Note: ContractWizard now exposes a manual "Focus sessions" target option. Until a dedicated
    // focus-session service is available, this branch intentionally returns null so the contract
    // remains user-driven (manual progress check-ins / outcome-only finalization).
    // For now, return null to fall back to manually tracked progress.
    return null;
  }

  return null;
}

function validateStakeAmount(
  stakeType: ContractStakeType,
  stakeAmount: number,
  currentBalance: number
): { valid: boolean; error?: string } {
  if (stakeAmount <= 0) {
    return { valid: false, error: 'Stake amount must be greater than 0' };
  }

  if (currentBalance <= 0) {
    return {
      valid: false,
      error: `You need at least 1 ${stakeType === 'gold' ? 'Gold' : 'Token'} to create a contract stake.`,
    };
  }

  const maxStake = Math.floor(currentBalance * 0.2); // 20% cap
  const currencyLabel = stakeType === 'gold' ? 'Gold' : 'Tokens';

  if (stakeAmount > maxStake) {
    return {
      valid: false,
      error: `Stake amount cannot exceed 20% of your current ${currencyLabel} balance (${maxStake} ${currencyLabel})`,
    };
  }

  if (maxStake < 1) {
    return {
      valid: false,
      error: `Build up your ${currencyLabel} to at least 5 before starting a stake-based contract.`,
    };
  }

  return { valid: true };
}

async function saveProfileBalanceUpdate(
  userId: string,
  totalPoints: number,
  zenTokens: number
): Promise<void> {
  if (!canUseSupabaseData()) {
    saveDemoProfile({
      total_points: totalPoints,
      zen_tokens: zenTokens,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('gamification_profiles')
    .update({
      total_points: totalPoints,
      zen_tokens: zenTokens,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;
}

function getMissesInWindow(
  evaluations: ContractEvaluation[],
  contractId: string,
  sinceDate: Date
): number {
  return evaluations.filter((evaluation) => {
    if (evaluation.contractId !== contractId) return false;
    if (evaluation.result !== 'miss') return false;
    return new Date(evaluation.evaluatedAt) >= sinceDate;
  }).length;
}

export async function getReduceStakeEligibility(
  userId: string,
  contract: CommitmentContract
): Promise<ReduceStakeEligibility> {
  if (contract.stakeAmount <= 1) {
    return {
      eligible: false,
      missesLast30Days: 0,
      reason: 'Stake is already at the minimum amount.',
    };
  }

  if (contract.stakeReducedAt) {
    const lastReducedTime = new Date(contract.stakeReducedAt).getTime();
    if (!Number.isNaN(lastReducedTime)) {
      const nextEligibleAt = new Date(lastReducedTime + 7 * 24 * 60 * 60 * 1000);
      if (Date.now() < nextEligibleAt.getTime()) {
        return {
          eligible: false,
          missesLast30Days: 0,
          reason: `Reduce stake can be used once every 7 days. Available again ${nextEligibleAt.toLocaleDateString()}.`,
          nextEligibleAt: nextEligibleAt.toISOString(),
        };
      }
    }

  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: evaluations, error } = await fetchContractEvaluations(userId, contract.id);
  if (error || !evaluations) {
    return {
      eligible: false,
      missesLast30Days: 0,
      reason: 'Unable to verify recent misses right now.',
    };
  }

  const missesLast30Days = getMissesInWindow(evaluations, contract.id, thirtyDaysAgo);
  if (missesLast30Days < 2) {
    return {
      eligible: false,
      missesLast30Days,
      reason: 'Reduce stake unlocks after 2 misses in the last 30 days.',
    };
  }

  return {
    eligible: true,
    missesLast30Days,
  };
}


export function getGentleRecoveryEligibility(contract: CommitmentContract): GentleRecoveryEligibility {
  if (contract.recoveryMode === 'gentle_ramp') {
    return {
      eligible: false,
      reason: 'Gentle ramp is already active for this contract.',
    };
  }

  if (contract.targetCount <= 1) {
    return {
      eligible: false,
      reason: 'This contract is already at the minimum target count.',
    };
  }

  if (contract.missCount < 2) {
    return {
      eligible: false,
      reason: 'Gentle ramp unlocks after 2 misses so recovery stays intentional.',
    };
  }

  return { eligible: true };
}

export function getResetContractEligibility(contract: CommitmentContract): ResetContractEligibility {
  if (contract.status !== 'active') {
    return {
      eligible: false,
      reason: 'Reset is only available for active contracts.',
    };
  }

  if (contract.missCount < 1) {
    return {
      eligible: false,
      reason: 'Reset unlocks after your first miss so it stays a true recovery tool.',
    };
  }

  if (!contract.lastResetAt) {
    return { eligible: true };
  }

  const lastResetTime = new Date(contract.lastResetAt).getTime();
  if (Number.isNaN(lastResetTime)) {
    return { eligible: true };
  }

  const nextEligibleAt = new Date(lastResetTime + 7 * 24 * 60 * 60 * 1000);
  if (Date.now() < nextEligibleAt.getTime()) {
    return {
      eligible: false,
      reason: `Reset can be used once every 7 days. Available again ${nextEligibleAt.toLocaleDateString()}.`,
      nextEligibleAt: nextEligibleAt.toISOString(),
    };
  }

  return { eligible: true };
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function createContract(
  userId: string,
  input: ContractInput
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    // Check active contract count (allow up to MAX_ACTIVE_CONTRACTS simultaneously)
    const { data: existingContracts } = await fetchContracts(userId);
    const activeCount = (existingContracts ?? []).filter((c) => c.status === 'active' || c.status === 'draft').length;
    if (activeCount >= MAX_ACTIVE_CONTRACTS) {
      return {
        data: null,
        error: new Error(`You can have at most ${MAX_ACTIVE_CONTRACTS} active contracts at a time.`),
      };
    }

    const contractType = input.contractType ?? 'classic';
    const cooldownCheck = checkSameContractCooldown(existingContracts ?? [], contractType, input.targetId);
    if (!cooldownCheck.allowed) {
      return {
        data: null,
        error: new Error(cooldownCheck.reason ?? 'You recently cancelled a matching contract. Please wait before creating it again.'),
      };
    }

    // Sacred contract yearly limit: max 2 per calendar year
    const isSacred = input.isSacred ?? contractType === 'sacred';
    if (isSacred) {
      const { data: reputation } = await fetchReputationScore(userId);
      const thisYear = new Date().getFullYear();
      const sacredYear = reputation?.sacredYear ?? thisYear;
      const sacredUsed = sacredYear === thisYear ? (reputation?.sacredContractsUsedThisYear ?? 0) : 0;
      const sacredLimitCheck = checkSacredContractLimit(sacredUsed);
      if (!sacredLimitCheck.allowed) {
        return {
          data: null,
          error: new Error(sacredLimitCheck.reason ?? 'You can only start 2 sacred contracts per calendar year.'),
        };
      }
    }

    // Validate stake amount
    const { data: profile, error: profileError } = await fetchGamificationProfile(userId);
    if (profileError || !profile) {
      return { data: null, error: profileError || new Error('Profile not found') };
    }

    const currentBalance = input.stakeType === 'gold' ? profile.total_points : profile.zen_tokens ?? 0;
    const validation = validateStakeAmount(input.stakeType, input.stakeAmount, currentBalance);
    
    if (!validation.valid) {
      return { data: null, error: new Error(validation.error) };
    }

    const now = new Date().toISOString();
    const startAt = input.startAt || now;
    const windowStart = getWindowStart(input.cadence, new Date(startAt));
    const accountabilityMode = input.accountabilityMode ?? 'solo';
    const witnessLabel = accountabilityMode === 'witness'
      ? input.witnessLabel?.trim().slice(0, 40) || null
      : null;

    // Determine contract tier based on type and stake
    const contractTier = deriveContractTier(contractType, isSacred, input.stakeAmount, currentBalance);

    const newContract: CommitmentContract = {
      id: createId('contract'),
      userId,
      title: input.title,
      targetType: input.targetType,
      targetId: input.targetId,
      cadence: input.cadence,
      targetCount: input.targetCount,
      stakeType: input.stakeType,
      stakeAmount: input.stakeAmount,
      graceDays: input.graceDays ?? 1,
      coolingOffHours: input.coolingOffHours ?? 24,
      status: 'draft',
      trackingMode: input.trackingMode ?? 'progress',
      currentProgress: 0,
      selfReportedOutcome: null,
      missCount: 0,
      successCount: 0,
      resetCount: 0,
      lastResetAt: null,
      recoveryMode: null,
      recoveryOriginalTargetCount: null,
      recoveryActivatedAt: null,
      accountabilityMode,
      witnessLabel,
      startAt,
      endAt: input.endAt ?? null,
      currentWindowStart: windowStart.toISOString(),
      lastEvaluatedAt: null,
      createdAt: now,
      updatedAt: now,
      contractType,
      contractTier,
      identityStatement: input.identityStatement ?? null,
      escalationLevel: 0,
      escalationMultiplier: 1.0,
      baseStakeAmount: contractType === 'escalation' ? input.stakeAmount : undefined,
      redemptionQuestId: null,
      redemptionQuestTitle: input.redemptionQuestTitle ?? null,
      redemptionQuestCompleted: false,
      futureMessage: input.futureMessage ?? null,
      futureMessageUnlockedAt: null,
      narrativeTheme: input.narrativeTheme ?? null,
      narrativeRank: 0,
      isSacred,
      sacredPenaltyMultiplier: isSacred ? 3.0 : 1.0,
      stages: input.stages ?? null,
      currentStageIndex: 0,
      unlocksContractId: input.unlocksContractId ?? null,
      unlockedByContractId: input.unlockedByContractId ?? null,
      reliabilityScoreImpact: isSacred ? 3.0 : 1.0,
    };

    const { data: allContracts } = await fetchContracts(userId);
    const updated = [...(allContracts ?? []), newContract];
    await saveContracts(userId, updated);

    // Update sacred contract year counter
    if (isSacred) {
      await incrementSacredContractUsed(userId);
    }

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_created',
      metadata: {
        contractId: newContract.id,
        targetType: newContract.targetType,
        cadence: newContract.cadence,
        stakeType: newContract.stakeType,
        stakeAmount: newContract.stakeAmount,
        accountabilityMode: newContract.accountabilityMode,
        witnessLabel: newContract.witnessLabel,
      } as TelemetryEventMetadata,
    });

    return { data: newContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to create contract'),
    };
  }
}

export async function fetchContracts(userId: string): Promise<ServiceResponse<CommitmentContract[]>> {
  try {
    if (!canUseSupabaseData()) {
      const stored = localStorage.getItem(getContractsKey(userId));
      const contracts: CommitmentContract[] = stored ? JSON.parse(stored) : [];
      return { data: contracts, error: null };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('commitment_contracts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    const contracts = (data ?? []).map((row) => contractFromRow(row as ContractRow));
    return { data: contracts, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load contracts'),
    };
  }
}

export async function fetchActiveContract(
  userId: string
): Promise<ServiceResponse<CommitmentContract | null>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error) return { data: null, error };

    const activeContract = contracts?.find((c) => c.status === 'active') ?? null;
    return { data: activeContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch active contract'),
    };
  }
}

export async function cancelContract(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];

    // Check if within cooling-off period
    const createdAt = new Date(contract.createdAt).getTime();
    const coolingOffEnd = createdAt + contract.coolingOffHours * 60 * 60 * 1000;
    const now = Date.now();
    const withinCoolingOff = now < coolingOffEnd;

    if (!withinCoolingOff && contract.status === 'active') {
      return {
        data: null,
        error: new Error('Cannot cancel active contract outside cooling-off period. Use pause instead.'),
      };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_cancelled',
      metadata: {
        contractId: updatedContract.id,
        withinCoolingOff,
      } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to cancel contract'),
    };
  }
}

export async function pauseContract(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];

    if (contract.status !== 'active') {
      return {
        data: null,
        error: new Error('Can only pause active contracts'),
      };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      status: 'paused',
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to pause contract'),
    };
  }
}

export async function resumeContract(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];

    if (contract.status !== 'paused') {
      return {
        data: null,
        error: new Error('Can only resume paused contracts'),
      };
    }

    // Reset window when resuming
    const now = new Date();
    const windowStart = getWindowStart(contract.cadence, now);

    const updatedContract: CommitmentContract = {
      ...contract,
      status: 'active',
      currentWindowStart: windowStart.toISOString(),
      currentProgress: 0, // Reset progress for new window
      updatedAt: now.toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to resume contract'),
    };
  }
}

export async function activateContract(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];

    if (contract.status !== 'draft') {
      return {
        data: null,
        error: new Error('Can only activate draft contracts'),
      };
    }

    // Check active contract count against the limit
    const activeCount = contracts.filter(
      (c) => (c.status === 'active') && c.id !== contractId
    ).length;
    if (activeCount >= MAX_ACTIVE_CONTRACTS) {
      return {
        data: null,
        error: new Error(`You can have at most ${MAX_ACTIVE_CONTRACTS} active contracts at a time.`),
      };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void incrementContractsStarted(userId);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_activated',
      metadata: {
        contractId: updatedContract.id,
        contractType: updatedContract.contractType,
      } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to activate contract'),
    };
  }
}

export async function resetContractWithSameSettings(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((contract) => contract.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    const eligibility = getResetContractEligibility(contract);
    if (!eligibility.eligible) {
      void recordTelemetryEvent({
        userId,
        eventType: 'contract_reset_blocked',
        metadata: {
          contractId: contract.id,
          reason: eligibility.reason ?? 'ineligible',
          nextEligibleAt: eligibility.nextEligibleAt ?? null,
        } as TelemetryEventMetadata,
      });

      return {
        data: null,
        error: new Error(eligibility.reason ?? 'Contract is not eligible for reset'),
      };
    }

    const now = new Date();
    const windowStart = getWindowStart(contract.cadence, now);
    const updatedContract: CommitmentContract = {
      ...contract,
      currentProgress: 0,
      resetCount: (contract.resetCount ?? 0) + 1,
      lastResetAt: now.toISOString(),
      currentWindowStart: windowStart.toISOString(),
      updatedAt: now.toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_reset',
      metadata: {
        contractId: updatedContract.id,
        cadence: updatedContract.cadence,
        stakeType: updatedContract.stakeType,
        stakeAmount: updatedContract.stakeAmount,
        resetCount: updatedContract.resetCount,
      } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to reset contract'),
    };
  }
}

export async function reduceContractStake(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((contract) => contract.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    const eligibility = await getReduceStakeEligibility(userId, contract);
    if (!eligibility.eligible) {
      void recordTelemetryEvent({
        userId,
        eventType: 'contract_stake_reduce_blocked',
        metadata: {
          contractId: contract.id,
          reason: eligibility.reason ?? 'ineligible',
          missesLast30Days: eligibility.missesLast30Days,
          nextEligibleAt: eligibility.nextEligibleAt ?? null,
        } as TelemetryEventMetadata,
      });

      return {
        data: null,
        error: new Error(eligibility.reason ?? 'Contract is not eligible for reduce stake'),
      };
    }

    const now = new Date().toISOString();
    const reducedStakeAmount = Math.max(1, Math.floor(contract.stakeAmount * 0.75));
    if (reducedStakeAmount >= contract.stakeAmount) {
      return {
        data: null,
        error: new Error('Stake is already too low to reduce further.'),
      };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      stakeAmount: reducedStakeAmount,
      stakeReducedAt: now,
      updatedAt: now,
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_stake_reduced',
      metadata: {
        contractId: contract.id,
        previousStakeAmount: contract.stakeAmount,
        newStakeAmount: reducedStakeAmount,
        missesLast30Days: eligibility.missesLast30Days,
      } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to reduce stake'),
    };
  }
}

export async function activateGentleRampRecovery(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((contract) => contract.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    const eligibility = getGentleRecoveryEligibility(contract);
    if (!eligibility.eligible) {
      return {
        data: null,
        error: new Error(eligibility.reason ?? 'Contract is not eligible for gentle ramp recovery'),
      };
    }

    const now = new Date().toISOString();
    const updatedContract: CommitmentContract = {
      ...contract,
      targetCount: Math.max(1, contract.targetCount - 1),
      recoveryMode: 'gentle_ramp',
      recoveryOriginalTargetCount: contract.targetCount,
      recoveryActivatedAt: now,
      updatedAt: now,
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_recovery_mode_enabled',
      metadata: {
        contractId: contract.id,
        recoveryMode: 'gentle_ramp',
        previousTargetCount: contract.targetCount,
        newTargetCount: updatedContract.targetCount,
      } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to activate gentle ramp recovery'),
    };
  }
}

export async function recordWitnessPing(
  userId: string,
  contract: CommitmentContract,
  channel: 'share' | 'clipboard'
): Promise<void> {
  if (contract.accountabilityMode !== 'witness' || !contract.witnessLabel) {
    return;
  }

  await recordTelemetryEvent({
    userId,
    eventType: 'contract_witness_pinged',
    metadata: {
      contractId: contract.id,
      stakeType: contract.stakeType,
      stakeAmount: contract.stakeAmount,
      cadence: contract.cadence,
      missCount: contract.missCount,
      witnessLabel: contract.witnessLabel,
      channel,
    } as TelemetryEventMetadata,
  });
}


// =====================================================
// PROGRESS TRACKING
// =====================================================

export async function recordContractProgress(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];

    if (contract.status !== 'active') {
      return {
        data: null,
        error: new Error('Can only record progress for active contracts'),
      };
    }

    if (contract.trackingMode === 'outcome_only') {
      return {
        data: null,
        error: new Error('Outcome-only contracts do not use progress check-ins. Log a failure or finalize at end date.'),
      };
    }

    // Check if we're still in the same window
    const now = new Date();
    const currentWindowStart = new Date(contract.currentWindowStart);
    const windowEnd = getWindowEnd(currentWindowStart, contract.cadence);

    // If we've passed the window, evaluate the contract first
    if (now > windowEnd) {
      const { data: evaluated } = await evaluateContract(userId, contractId);
      if (evaluated) {
        // Return the contract after evaluation
        const { data: refreshedContracts } = await fetchContracts(userId);
        const refreshedContract = refreshedContracts?.find((c) => c.id === contractId);
        if (refreshedContract) {
          return { data: refreshedContract, error: null };
        }
      }
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      currentProgress: contract.currentProgress + 1,
      updatedAt: now.toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to record contract progress'),
    };
  }
}

export async function syncContractProgressWithTarget(
  userId: string,
  contractId: string,
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((contract) => contract.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    if (contract.status !== 'active') {
      return { data: contract, error: null };
    }

    const verifiedProgress = await getVerifiedProgressCount(userId, contract);
    if (verifiedProgress === null) {
      return { data: contract, error: null };
    }

    if (verifiedProgress === contract.currentProgress) {
      return { data: contract, error: null };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      currentProgress: verifiedProgress,
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to sync contract progress'),
    };
  }
}

// =====================================================
// EVALUATION
// =====================================================

export async function evaluateContract(
  userId: string,
  contractId: string,
  options?: { forceResult?: 'success' | 'miss' }
): Promise<ServiceResponse<ContractEvaluation>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];

    if (contract.status !== 'active') {
      return {
        data: null,
        error: new Error('Can only evaluate active contracts'),
      };
    }

    const now = new Date();
    const windowStart = new Date(contract.currentWindowStart);
    const windowEnd = getWindowEnd(windowStart, contract.cadence);

    // Check if end date has passed — auto-complete the contract
    const hasEndDatePassed = contract.endAt !== null && now > new Date(contract.endAt);

    // Calculate result
    let actualCount = contract.currentProgress;
    let result: 'success' | 'miss';
    if (options?.forceResult) {
      result = options.forceResult;
      actualCount = result === 'success' ? contract.targetCount : 0;
    } else if (contract.trackingMode === 'outcome_only') {
      if (contract.selfReportedOutcome === 'miss') {
        result = 'miss';
        actualCount = 0;
      } else {
        if (contract.endAt && now < new Date(contract.endAt)) {
          return {
            data: null,
            error: new Error('This outcome-only contract can be finalized on or after its end date, or you can log a failure now.'),
          };
        }
        result = 'success';
        actualCount = contract.targetCount;
      }
    } else {
      const targetWithGrace = contract.contractType === 'reverse'
        ? contract.targetCount + contract.graceDays
        : Math.max(0, contract.targetCount - contract.graceDays);
      result = contract.contractType === 'reverse'
        ? (actualCount <= targetWithGrace ? 'success' : 'miss')
        : (actualCount >= targetWithGrace ? 'success' : 'miss');
    }
    const graceDaysUsed = contract.contractType === 'reverse'
      ? Math.min(contract.graceDays, Math.max(0, actualCount - contract.targetCount))
      : Math.min(
        contract.graceDays,
        Math.max(0, contract.targetCount - actualCount)
      );
    const { data: priorEvaluations } = await fetchContractEvaluations(userId, contract.id);
    const successStreakBeforeEvaluation = result === 'success'
      ? getSuccessStreakFromEvaluations(priorEvaluations ?? [])
      : 0;
    const successStreakAfterEvaluation = result === 'success'
      ? successStreakBeforeEvaluation + 1
      : 0;
    const rewardMultiplier = result === 'success'
      ? getContractRewardMultiplier(successStreakAfterEvaluation)
      : 1;

    // Apply contract-type-specific stake modifiers
    // Sacred: 3x penalty on miss, 3x bonus on success
    const sacredMultiplier = contract.isSacred ? (contract.sacredPenaltyMultiplier ?? 3.0) : 1.0;
    // Escalation: stake grows on consecutive misses
    const escalationMultiplier = contract.contractType === 'escalation'
      ? (contract.escalationMultiplier ?? 1.0)
      : 1.0;

    const effectiveStake = Math.round(contract.stakeAmount * escalationMultiplier);

    // Prepare evaluation record
    const evaluation: ContractEvaluation = {
      id: createId('evaluation'),
      contractId: contract.id,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      targetCount: contract.targetCount,
      actualCount,
      graceDaysUsed,
      result,
      stakeForfeited: result === 'miss' ? Math.round(effectiveStake * sacredMultiplier) : 0,
      bonusAwarded: result === 'success'
        ? Math.max(1, Math.floor(effectiveStake * 0.1 * rewardMultiplier * (contract.isSacred ? sacredMultiplier : 1.0)))
        : 0,
      evaluatedAt: now.toISOString(),
    };

    // Store evaluation
    const { data: evaluations } = await fetchEvaluations(userId);
    const updatedEvaluations = [...(evaluations ?? []), evaluation];
    await saveEvaluations(userId, updatedEvaluations);

    // Update profile currency
    const { data: profile, error: profileError } = await fetchGamificationProfile(userId);
    if (!profileError && profile) {
      if (result === 'success') {
        const newBalance =
          contract.stakeType === 'gold'
            ? profile.total_points + evaluation.bonusAwarded
            : profile.total_points;
        const newTokens =
          contract.stakeType === 'tokens'
            ? (profile.zen_tokens ?? 0) + evaluation.bonusAwarded
            : profile.zen_tokens;

        await saveProfileBalanceUpdate(userId, newBalance, newTokens ?? 0);
      } else {
        const newBalance =
          contract.stakeType === 'gold'
            ? Math.max(0, profile.total_points - evaluation.stakeForfeited)
            : profile.total_points;
        const newTokens =
          contract.stakeType === 'tokens'
            ? Math.max(0, (profile.zen_tokens ?? 0) - evaluation.stakeForfeited)
            : profile.zen_tokens;

        await saveProfileBalanceUpdate(userId, newBalance, newTokens ?? 0);
      }
    }

    // Update contract
    const nextWindowStart = getWindowStart(
      contract.cadence,
      new Date(windowEnd.getTime() + 1000)
    );

    const shouldExitGentleRamp = contract.recoveryMode === 'gentle_ramp' && result === 'success';

    // Escalation: adjust level and multiplier
    let newEscalationLevel = contract.escalationLevel ?? 0;
    let newEscalationMultiplier = contract.escalationMultiplier ?? 1.0;
    if (contract.contractType === 'escalation') {
      if (result === 'miss') {
        const MAX_ESCALATION_LEVEL = 4;
        newEscalationLevel = Math.min(MAX_ESCALATION_LEVEL, newEscalationLevel + 1);
        newEscalationMultiplier = Math.min(3.0, 1.0 + newEscalationLevel * 0.5);
      } else {
        newEscalationLevel = 0;
        newEscalationMultiplier = 1.0;
      }
    }

    // Future self: unlock message on success
    const futureMessageUnlockedAt =
      result === 'success' && contract.futureMessage && !contract.futureMessageUnlockedAt
        ? now.toISOString()
        : (contract.futureMessageUnlockedAt ?? null);

    // Auto-complete the contract if end date has passed
    const contractStatus: CommitmentContract['status'] = hasEndDatePassed ? 'completed' : 'active';

    const updatedContract: CommitmentContract = {
      ...contract,
      currentProgress: 0,
      selfReportedOutcome: null,
      targetCount: shouldExitGentleRamp
        ? contract.recoveryOriginalTargetCount ?? contract.targetCount
        : contract.targetCount,
      recoveryMode: shouldExitGentleRamp ? null : contract.recoveryMode ?? null,
      recoveryOriginalTargetCount: shouldExitGentleRamp ? null : contract.recoveryOriginalTargetCount ?? null,
      recoveryActivatedAt: shouldExitGentleRamp ? null : contract.recoveryActivatedAt ?? null,
      currentWindowStart: nextWindowStart.toISOString(),
      missCount: result === 'miss' ? contract.missCount + 1 : contract.missCount,
      successCount: result === 'success' ? contract.successCount + 1 : contract.successCount,
      lastEvaluatedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: contractStatus,
      escalationLevel: newEscalationLevel,
      escalationMultiplier: newEscalationMultiplier,
      futureMessageUnlockedAt,
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    // Update reputation score
    void updateReputationAfterEvaluation(userId, contract, result);

    // Fire achievement checks
    void checkContractAchievements(userId, updatedContract, result, successStreakAfterEvaluation);

    // Unlock cascading contract if this one just completed successfully
    if (hasEndDatePassed && result === 'success' && contract.unlocksContractId) {
      void unlockCascadingContract(userId, contract.unlocksContractId, contracts);
    }

    if (result === 'success') {
      void checkContractZenGardenRewards(userId, updatedContract, result);
    }

    void recordTelemetryEvent({
      userId,
      eventType: result === 'success' ? 'contract_completed' : 'contract_missed',
      metadata: {
        contractId: contract.id,
        result,
        contractType: contract.contractType,
        stakeForfeited: evaluation.stakeForfeited,
        bonusAwarded: evaluation.bonusAwarded,
        rewardMultiplier,
        successStreak: successStreakAfterEvaluation,
        isSacred: contract.isSacred,
      } as TelemetryEventMetadata,
    });

    if (result === 'miss') {
      void recordTelemetryEvent({
        userId,
        eventType: 'contract_stake_forfeited',
        metadata: {
          contractId: contract.id,
          stakeAmount: evaluation.stakeForfeited,
          stakeType: contract.stakeType,
        } as TelemetryEventMetadata,
      });
    }

    if (shouldExitGentleRamp) {
      void recordTelemetryEvent({
        userId,
        eventType: 'contract_recovery_mode_completed',
        metadata: {
          contractId: contract.id,
          recoveryMode: 'gentle_ramp',
          restoredTargetCount: updatedContract.targetCount,
        } as TelemetryEventMetadata,
      });
    }

    if (hasEndDatePassed) {
      void recordTelemetryEvent({
        userId,
        eventType: 'contract_auto_completed',
        metadata: {
          contractId: contract.id,
          endAt: contract.endAt,
          finalResult: result,
        } as TelemetryEventMetadata,
      });
    }

    return { data: evaluation, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to evaluate contract'),
    };
  }
}

export async function evaluateDueContracts(
  userId: string
): Promise<ServiceResponse<ContractEvaluation[]>> {
  try {
    if (canUseSupabaseData()) {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any).rpc('evaluate_due_commitment_contracts', {
        p_user_id: userId,
        p_max_windows: 12,
      });

      if (error) {
        throw error;
      }

      const evaluations = (data ?? []).map((row: unknown) => evaluationFromRow(row as EvaluationRow));
      return { data: evaluations, error: null };
    }

    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const now = new Date();
    const dueContracts = contracts.filter((contract) => {
      if (contract.status !== 'active') {
        return false;
      }

      const windowStart = new Date(contract.currentWindowStart);
      const windowEnd = getWindowEnd(windowStart, contract.cadence);
      if (contract.trackingMode === 'outcome_only') {
        return contract.endAt !== null && now > new Date(contract.endAt);
      }

      return now > windowEnd;
    });

    if (dueContracts.length === 0) {
      return { data: [], error: null };
    }

    const evaluations: ContractEvaluation[] = [];
    const maxCatchUpWindowsPerSweep = 12;

    for (const contract of dueContracts) {
      let windowsProcessed = 0;
      let shouldContinue = true;

      while (shouldContinue && windowsProcessed < maxCatchUpWindowsPerSweep) {
        const { data: evaluation, error: evaluationError } = await evaluateContract(userId, contract.id);
        if (evaluationError || !evaluation) {
          break;
        }

        evaluations.push(evaluation);
        windowsProcessed += 1;

        const { data: refreshedContracts, error: refreshedContractsError } = await fetchContracts(userId);
        if (refreshedContractsError || !refreshedContracts) {
          break;
        }

        const refreshedContract = refreshedContracts.find((item) => item.id === contract.id);
        if (!refreshedContract || refreshedContract.status !== 'active') {
          shouldContinue = false;
          continue;
        }

        const refreshedWindowStart = new Date(refreshedContract.currentWindowStart);
        const refreshedWindowEnd = getWindowEnd(refreshedWindowStart, refreshedContract.cadence);
        shouldContinue = new Date() > refreshedWindowEnd;
      }
    }

    return { data: evaluations, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to evaluate due contracts'),
    };
  }
}

export async function fetchEvaluations(
  userId: string
): Promise<ServiceResponse<ContractEvaluation[]>> {
  try {
    if (!canUseSupabaseData()) {
      const stored = localStorage.getItem(getEvaluationsKey(userId));
      const evaluations: ContractEvaluation[] = stored ? JSON.parse(stored) : [];
      return { data: evaluations, error: null };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('commitment_contract_evaluations')
      .select('*')
      .eq('user_id', userId)
      .order('evaluated_at', { ascending: false });

    if (error) throw error;
    const evaluations = (data ?? []).map((row: unknown) => evaluationFromRow(row as EvaluationRow));
    return { data: evaluations, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load evaluations'),
    };
  }
}

export async function fetchContractSweepHealth(): Promise<ServiceResponse<ContractSweepHealth | null>> {
  try {
    if (!canUseSupabaseData()) {
      return { data: null, error: null };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await (supabase as any).rpc('get_commitment_contract_sweep_health');
    if (error) {
      throw error;
    }

    const latestRun = (data as ContractSweepRunRow[] | null)?.[0] ?? null;
    if (!latestRun) {
      return { data: null, error: null };
    }

    return {
      data: {
        status: latestRun.status,
        triggeredAt: latestRun.triggered_at,
        finishedAt: latestRun.finished_at,
        usersProcessed: latestRun.users_processed,
        evaluationsCreated: latestRun.evaluations_created,
        failedUsers: latestRun.failed_users,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load contract sweep health'),
    };
  }
}

export async function fetchContractEvaluations(
  userId: string,
  contractId: string
): Promise<ServiceResponse<ContractEvaluation[]>> {
  try {
    const { data: evaluations, error } = await fetchEvaluations(userId);
    if (error) return { data: null, error };

    const contractEvaluations = evaluations?.filter((e) => e.contractId === contractId) ?? [];
    return { data: contractEvaluations, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch contract evaluations'),
    };
  }
}

export async function logOutcomeOnlyContractFailure(
  userId: string,
  contractId: string,
): Promise<ServiceResponse<ContractEvaluation>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((contract) => contract.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    if (contract.status !== 'active') {
      return { data: null, error: new Error('Only active contracts can log outcome failure') };
    }

    if (contract.trackingMode !== 'outcome_only') {
      return { data: null, error: new Error('This action is only for outcome-only contracts') };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      selfReportedOutcome: 'miss',
      endAt: new Date(Date.now() - 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    return evaluateContract(userId, contractId);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to log outcome contract failure'),
    };
  }
}

// =====================================================
// REPUTATION SYSTEM
// =====================================================

const REPUTATION_STORAGE_KEY = 'lifegoal_reputation';

function getReputationKey(userId: string): string {
  return `${REPUTATION_STORAGE_KEY}_${userId}`;
}

function calculateReputationTier(reliabilityRating: number, contractsStarted: number): ReputationTier {
  if (contractsStarted < 3) return 'untested';
  if (reliabilityRating < 0.6) return 'apprentice';
  if (reliabilityRating < 0.8) return 'dependable';
  if (reliabilityRating < 0.9) return 'reliable';
  if (reliabilityRating < 0.95) return 'steadfast';
  return 'unbreakable';
}

export async function fetchReputationScore(
  userId: string
): Promise<ServiceResponse<ReputationScore | null>> {
  try {
    if (!canUseSupabaseData()) {
      const stored = localStorage.getItem(getReputationKey(userId));
      if (!stored) return { data: null, error: null };
      return { data: JSON.parse(stored) as ReputationScore, error: null };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_reputation_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      throw error;
    }
    if (!data) return { data: null, error: null };

    const row = data as unknown as {
      user_id: string;
      contracts_started: number;
      contracts_completed: number;
      contracts_failed: number;
      contracts_cancelled: number;
      reliability_rating: number;
      reliability_tier: string;
      sacred_contracts_kept: number;
      sacred_contracts_broken: number;
      sacred_contracts_used_this_year: number;
      sacred_year: number;
      longest_contract_streak: number;
      total_stake_earned: number;
      total_stake_forfeited: number;
      updated_at: string;
    };

    return {
      data: {
        userId: row.user_id,
        contractsStarted: row.contracts_started,
        contractsCompleted: row.contracts_completed,
        contractsFailed: row.contracts_failed,
        contractsCancelled: row.contracts_cancelled,
        reliabilityRating: Number(row.reliability_rating),
        reliabilityTier: row.reliability_tier as ReputationTier,
        sacredContractsKept: row.sacred_contracts_kept,
        sacredContractsBroken: row.sacred_contracts_broken,
        sacredContractsUsedThisYear: row.sacred_contracts_used_this_year,
        sacredYear: row.sacred_year,
        longestContractStreak: row.longest_contract_streak,
        totalStakeEarned: row.total_stake_earned,
        totalStakeForfeited: row.total_stake_forfeited,
        updatedAt: row.updated_at,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch reputation score'),
    };
  }
}

async function saveReputationScore(userId: string, score: ReputationScore): Promise<void> {
  if (!canUseSupabaseData()) {
    localStorage.setItem(getReputationKey(userId), JSON.stringify(score));
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('user_reputation_scores').upsert(
    {
      user_id: userId,
      contracts_started: score.contractsStarted,
      contracts_completed: score.contractsCompleted,
      contracts_failed: score.contractsFailed,
      contracts_cancelled: score.contractsCancelled,
      reliability_rating: score.reliabilityRating,
      reliability_tier: score.reliabilityTier,
      sacred_contracts_kept: score.sacredContractsKept,
      sacred_contracts_broken: score.sacredContractsBroken,
      sacred_contracts_used_this_year: score.sacredContractsUsedThisYear,
      sacred_year: score.sacredYear,
      longest_contract_streak: score.longestContractStreak,
      total_stake_earned: score.totalStakeEarned,
      total_stake_forfeited: score.totalStakeForfeited,
      updated_at: score.updatedAt,
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}

async function incrementSacredContractUsed(userId: string): Promise<void> {
  try {
    const { data: existing } = await fetchReputationScore(userId);
    const thisYear = new Date().getFullYear();
    const current = existing ?? {
      userId,
      contractsStarted: 0,
      contractsCompleted: 0,
      contractsFailed: 0,
      contractsCancelled: 0,
      reliabilityRating: 0,
      reliabilityTier: 'untested' as ReputationTier,
      sacredContractsKept: 0,
      sacredContractsBroken: 0,
      sacredContractsUsedThisYear: 0,
      sacredYear: thisYear,
      longestContractStreak: 0,
      totalStakeEarned: 0,
      totalStakeForfeited: 0,
      updatedAt: new Date().toISOString(),
    };

    const sacredYear = current.sacredYear ?? thisYear;
    const sacredUsed = sacredYear === thisYear ? current.sacredContractsUsedThisYear : 0;
    const updated: ReputationScore = {
      ...current,
      sacredContractsUsedThisYear: sacredUsed + 1,
      sacredYear: thisYear,
      updatedAt: new Date().toISOString(),
    };
    await saveReputationScore(userId, updated);
  } catch {
    // Silently fail — don't block contract creation
  }
}

async function incrementContractsStarted(userId: string): Promise<void> {
  try {
    const { data: existing } = await fetchReputationScore(userId);
    const now = new Date().toISOString();
    const thisYear = new Date().getFullYear();
    const current: ReputationScore = existing ?? {
      userId,
      contractsStarted: 0,
      contractsCompleted: 0,
      contractsFailed: 0,
      contractsCancelled: 0,
      reliabilityRating: 0,
      reliabilityTier: 'untested' as ReputationTier,
      sacredContractsKept: 0,
      sacredContractsBroken: 0,
      sacredContractsUsedThisYear: 0,
      sacredYear: thisYear,
      longestContractStreak: 0,
      totalStakeEarned: 0,
      totalStakeForfeited: 0,
      updatedAt: now,
    };

    await saveReputationScore(userId, {
      ...current,
      contractsStarted: current.contractsStarted + 1,
      updatedAt: now,
    });
  } catch {
    // Silently fail — don't block activation
  }
}

async function updateReputationAfterEvaluation(
  userId: string,
  contract: CommitmentContract,
  result: 'success' | 'miss'
): Promise<void> {
  try {
    const { data: existing } = await fetchReputationScore(userId);
    const now = new Date().toISOString();
    const thisYear = new Date().getFullYear();

    const base: ReputationScore = existing ?? {
      userId,
      contractsStarted: 0,
      contractsCompleted: 0,
      contractsFailed: 0,
      contractsCancelled: 0,
      reliabilityRating: 0,
      reliabilityTier: 'untested',
      sacredContractsKept: 0,
      sacredContractsBroken: 0,
      sacredContractsUsedThisYear: 0,
      sacredYear: thisYear,
      longestContractStreak: 0,
      totalStakeEarned: 0,
      totalStakeForfeited: 0,
      updatedAt: now,
    };

    const newCompleted = result === 'success' ? base.contractsCompleted + 1 : base.contractsCompleted;
    const newFailed = result === 'miss' ? base.contractsFailed + 1 : base.contractsFailed;
    const totalEvaluated = newCompleted + newFailed;
    const reliabilityRating = totalEvaluated > 0 ? newCompleted / totalEvaluated : 0;

    const updated: ReputationScore = {
      ...base,
      contractsCompleted: newCompleted,
      contractsFailed: newFailed,
      reliabilityRating,
      reliabilityTier: calculateReputationTier(reliabilityRating, base.contractsStarted),
      sacredContractsKept:
        contract.isSacred && result === 'success' ? base.sacredContractsKept + 1 : base.sacredContractsKept,
      sacredContractsBroken:
        contract.isSacred && result === 'miss' ? base.sacredContractsBroken + 1 : base.sacredContractsBroken,
      totalStakeEarned: result === 'success' ? base.totalStakeEarned + contract.stakeAmount : base.totalStakeEarned,
      totalStakeForfeited: result === 'miss' ? base.totalStakeForfeited + contract.stakeAmount : base.totalStakeForfeited,
      updatedAt: now,
    };

    await saveReputationScore(userId, updated);
  } catch {
    // Silently fail — don't block evaluation
  }
}

// =====================================================
// ACHIEVEMENT CHECKS (Part 1E)
// =====================================================

// Achievement keys for contract milestones
export const CONTRACT_ACHIEVEMENT_KEYS = {
  FIRST_KEPT: 'contract_first_kept',
  STREAK_5: 'contract_5_streak',
  STREAK_10: 'contract_10_streak',
  PERFECT_MONTH: 'contract_perfect_month',
  SACRED_KEEPER: 'contract_sacred_keeper',
} as const;

async function checkContractAchievements(
  userId: string,
  contract: CommitmentContract,
  result: 'success' | 'miss',
  streak: number
): Promise<void> {
  if (result !== 'success') return;

  void recordTelemetryEvent({
    userId,
    eventType: 'contract_achievement_check',
    metadata: {
      contractId: contract.id,
      successCount: contract.successCount,
      streak,
      isSacred: contract.isSacred ?? false,
      contractType: contract.contractType,
    } as TelemetryEventMetadata,
  });

  if (contract.successCount === 1) {
    void recordTelemetryEvent({
      userId,
      eventType: 'achievement_progress',
      metadata: { achievementKey: CONTRACT_ACHIEVEMENT_KEYS.FIRST_KEPT } as TelemetryEventMetadata,
    });
  }

  if (streak >= 5) {
    void recordTelemetryEvent({
      userId,
      eventType: 'achievement_progress',
      metadata: { achievementKey: CONTRACT_ACHIEVEMENT_KEYS.STREAK_5, streak } as TelemetryEventMetadata,
    });
  }

  if (streak >= 10) {
    void recordTelemetryEvent({
      userId,
      eventType: 'achievement_progress',
      metadata: { achievementKey: CONTRACT_ACHIEVEMENT_KEYS.STREAK_10, streak } as TelemetryEventMetadata,
    });
  }

  if (contract.isSacred) {
    void recordTelemetryEvent({
      userId,
      eventType: 'achievement_progress',
      metadata: { achievementKey: CONTRACT_ACHIEVEMENT_KEYS.SACRED_KEEPER } as TelemetryEventMetadata,
    });
  }
}

// =====================================================
// CASCADING CONTRACT UNLOCK (Part 11)
// =====================================================

async function unlockCascadingContract(
  userId: string,
  contractId: string,
  allContracts: CommitmentContract[]
): Promise<void> {
  try {
    const targetIndex = allContracts.findIndex((c) => c.id === contractId);
    if (targetIndex === -1) return;

    const target = allContracts[targetIndex];
    if (target.status !== 'locked') return;

    const updated: CommitmentContract = {
      ...target,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...allContracts];
    updatedContracts[targetIndex] = updated;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_cascading_unlocked',
      metadata: {
        unlockedContractId: contractId,
      } as TelemetryEventMetadata,
    });
  } catch {
    // Silently fail
  }
}

// =====================================================
// CONTRACT TIER DERIVATION (Part 13)
// =====================================================

function deriveContractTier(
  contractType: ContractType,
  isSacred: boolean,
  stakeAmount: number,
  currentBalance: number
): ContractTier {
  if (isSacred || contractType === 'sacred') return 'sacred';

  const stakeRatio = currentBalance > 0 ? stakeAmount / currentBalance : 0;

  if (contractType === 'narrative' || contractType === 'multi_stage' || stakeRatio >= 0.15) {
    return 'legendary';
  }

  if (contractType === 'escalation' || contractType === 'future_self' || stakeRatio >= 0.1) {
    return 'epic';
  }

  if (contractType === 'identity' || contractType === 'redemption' || stakeRatio >= 0.05) {
    return 'rare';
  }

  return 'common';
}

// =====================================================
// REDEMPTION QUEST LOGIC (Part 5)
// =====================================================

export async function generateRedemptionQuest(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    if (contract.contractType !== 'redemption') {
      return { data: null, error: new Error('Only redemption contracts can have redemption quests') };
    }

    const questId = createId('redemption-quest');
    const questTitle = contract.redemptionQuestTitle
      ?? `Complete ${contract.targetCount * 2} ${contract.targetType.toLowerCase()} sessions to redeem yourself`;

    const updatedContract: CommitmentContract = {
      ...contract,
      redemptionQuestId: questId,
      redemptionQuestTitle: questTitle,
      redemptionQuestCompleted: false,
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_redemption_quest_generated',
      metadata: { contractId, questId, questTitle } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to generate redemption quest'),
    };
  }
}

export async function completeRedemptionQuest(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    if (!contract.redemptionQuestId) {
      return { data: null, error: new Error('No active redemption quest for this contract') };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      redemptionQuestCompleted: true,
      redemptionQuestId: null,
      missCount: Math.max(0, contract.missCount - 1),
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_redemption_quest_completed',
      metadata: { contractId } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to complete redemption quest'),
    };
  }
}

export async function failRedemptionQuest(
  userId: string,
  contractId: string
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) {
      return { data: null, error: error || new Error('Contracts not found') };
    }

    const contractIndex = contracts.findIndex((c) => c.id === contractId);
    if (contractIndex === -1) {
      return { data: null, error: new Error('Contract not found') };
    }

    const contract = contracts[contractIndex];
    if (!contract.redemptionQuestId) {
      return { data: null, error: new Error('No active redemption quest for this contract') };
    }

    const updatedContract: CommitmentContract = {
      ...contract,
      redemptionQuestId: null,
      redemptionQuestCompleted: false,
      updatedAt: new Date().toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_redemption_quest_failed',
      metadata: { contractId } as TelemetryEventMetadata,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fail redemption quest'),
    };
  }
}

// =====================================================
// ACTIVE CONTRACTS LIST (multi-contract support)
// =====================================================

export async function fetchActiveContracts(
  userId: string
): Promise<ServiceResponse<CommitmentContract[]>> {
  try {
    const { data: contracts, error } = await fetchContracts(userId);
    if (error) return { data: null, error };

    const activeContracts = (contracts ?? []).filter(
      (c) => c.status === 'active' || c.status === 'paused'
    );
    return { data: activeContracts, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch active contracts'),
    };
  }
}
