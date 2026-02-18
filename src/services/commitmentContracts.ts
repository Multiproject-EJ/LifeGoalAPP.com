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
} from '../types/gamification';
import { recordTelemetryEvent, type TelemetryEventMetadata } from './telemetry';
import {
  getContractRewardMultiplier,
  getSuccessStreakFromEvaluations,
} from '../lib/contractRewardMultipliers';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

export type ReduceStakeEligibility = {
  eligible: boolean;
  missesLast30Days: number;
  reason?: string;
};

export type GentleRecoveryEligibility = {
  eligible: boolean;
  reason?: string;
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
  current_progress: number;
  miss_count: number;
  success_count: number;
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
    currentProgress: row.current_progress,
    missCount: row.miss_count,
    successCount: row.success_count,
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
    current_progress: contract.currentProgress,
    miss_count: contract.missCount,
    success_count: contract.successCount,
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
    return {
      eligible: false,
      missesLast30Days: 0,
      reason: 'Reduce stake is a one-time recovery action for each contract.',
    };
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

// =====================================================
// CRUD OPERATIONS
// =====================================================

export async function createContract(
  userId: string,
  input: ContractInput
): Promise<ServiceResponse<CommitmentContract>> {
  try {
    // Check if user already has an active contract (MVP limit: one active contract max)
    const { data: activeContract } = await fetchActiveContract(userId);
    if (activeContract) {
      return {
        data: null,
        error: new Error('You already have an active contract. Complete or cancel it first.'),
      };
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
      graceDays: input.graceDays ?? 1, // Default to 1 grace day
      coolingOffHours: input.coolingOffHours ?? 24, // Default to 24 hours
      status: 'draft', // Start in draft, becomes active after cooling-off confirmation
      currentProgress: 0,
      missCount: 0,
      successCount: 0,
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
    };

    const { data: contracts } = await fetchContracts(userId);
    const updated = [...(contracts ?? []), newContract];
    await saveContracts(userId, updated);

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

    // Check for existing active contract
    const { data: activeContract } = await fetchActiveContract(userId);
    if (activeContract && activeContract.id !== contractId) {
      return {
        data: null,
        error: new Error('You already have an active contract. Complete or cancel it first.'),
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

    void recordTelemetryEvent({
      userId,
      eventType: 'contract_activated',
      metadata: {
        contractId: updatedContract.id,
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
    if (contract.status !== 'active') {
      return { data: null, error: new Error('Can only reset active contracts') };
    }

    const now = new Date();
    const windowStart = getWindowStart(contract.cadence, now);
    const updatedContract: CommitmentContract = {
      ...contract,
      currentProgress: 0,
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
  contractId: string
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

    // Calculate result
    const actualCount = contract.currentProgress;
    const targetWithGrace = contract.targetCount - contract.graceDays;
    const result = actualCount >= targetWithGrace ? 'success' : 'miss';
    const graceDaysUsed = Math.min(
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
      stakeForfeited: result === 'miss' ? contract.stakeAmount : 0,
      bonusAwarded: result === 'success'
        ? Math.max(1, Math.floor(contract.stakeAmount * 0.1 * rewardMultiplier))
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
        // Award bonus
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
        // Forfeit stake to commitment pool (virtual sink)
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

    const updatedContract: CommitmentContract = {
      ...contract,
      currentProgress: 0,
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
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    await saveContracts(userId, updatedContracts);

    void recordTelemetryEvent({
      userId,
      eventType: result === 'success' ? 'contract_completed' : 'contract_missed',
      metadata: {
        contractId: contract.id,
        result,
        stakeForfeited: evaluation.stakeForfeited,
        bonusAwarded: evaluation.bonusAwarded,
        rewardMultiplier,
        successStreak: successStreakAfterEvaluation,
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
