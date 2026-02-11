import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import type {
  CommitmentContract,
  ContractEvaluation,
  ContractStatus,
  ContractTargetType,
  ContractCadence,
  ContractStakeType,
} from '../types/gamification';
import { recordTelemetryEvent } from './telemetry';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
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

function validateStakeAmount(
  stakeType: ContractStakeType,
  stakeAmount: number,
  currentBalance: number
): { valid: boolean; error?: string } {
  if (stakeAmount <= 0) {
    return { valid: false, error: 'Stake amount must be greater than 0' };
  }

  if (stakeType === 'gold') {
    const maxStake = Math.floor(currentBalance * 0.2); // 20% cap
    if (stakeAmount > maxStake) {
      return {
        valid: false,
        error: `Stake amount cannot exceed 20% of your current Gold balance (${maxStake} Gold)`,
      };
    }
  }

  // For tokens, we could add similar validation in the future
  // For now, just check positivity

  return { valid: true };
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
      startAt,
      endAt: input.endAt ?? null,
      currentWindowStart: windowStart.toISOString(),
      lastEvaluatedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const { data: contracts } = await fetchContracts(userId);
    const updated = [...(contracts ?? []), newContract];
    localStorage.setItem(getContractsKey(userId), JSON.stringify(updated));

    recordTelemetryEvent('contract_created', {
      contractId: newContract.id,
      targetType: newContract.targetType,
      cadence: newContract.cadence,
      stakeType: newContract.stakeType,
      stakeAmount: newContract.stakeAmount,
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
    const stored = localStorage.getItem(getContractsKey(userId));
    const contracts: CommitmentContract[] = stored ? JSON.parse(stored) : [];
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
    localStorage.setItem(getContractsKey(userId), JSON.stringify(updatedContracts));

    recordTelemetryEvent('contract_cancelled', {
      contractId: updatedContract.id,
      withinCoolingOff,
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
    localStorage.setItem(getContractsKey(userId), JSON.stringify(updatedContracts));

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
    localStorage.setItem(getContractsKey(userId), JSON.stringify(updatedContracts));

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
    localStorage.setItem(getContractsKey(userId), JSON.stringify(updatedContracts));

    recordTelemetryEvent('contract_activated', {
      contractId: updatedContract.id,
    });

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to activate contract'),
    };
  }
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
    localStorage.setItem(getContractsKey(userId), JSON.stringify(updatedContracts));

    return { data: updatedContract, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to record contract progress'),
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
      bonusAwarded: result === 'success' ? Math.floor(contract.stakeAmount * 0.1) : 0, // 10% bonus on success
      evaluatedAt: now.toISOString(),
    };

    // Store evaluation
    const { data: evaluations } = await fetchEvaluations(userId);
    const updatedEvaluations = [...(evaluations ?? []), evaluation];
    localStorage.setItem(getEvaluationsKey(userId), JSON.stringify(updatedEvaluations));

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

        saveDemoProfile({
          ...profile,
          total_points: newBalance,
          zen_tokens: newTokens,
        });
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

        saveDemoProfile({
          ...profile,
          total_points: newBalance,
          zen_tokens: newTokens,
        });
      }
    }

    // Update contract
    const nextWindowStart = getWindowStart(
      contract.cadence,
      new Date(windowEnd.getTime() + 1000)
    );

    const updatedContract: CommitmentContract = {
      ...contract,
      currentProgress: 0,
      currentWindowStart: nextWindowStart.toISOString(),
      missCount: result === 'miss' ? contract.missCount + 1 : contract.missCount,
      successCount: result === 'success' ? contract.successCount + 1 : contract.successCount,
      lastEvaluatedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const updatedContracts = [...contracts];
    updatedContracts[contractIndex] = updatedContract;
    localStorage.setItem(getContractsKey(userId), JSON.stringify(updatedContracts));

    recordTelemetryEvent(result === 'success' ? 'contract_completed' : 'contract_missed', {
      contractId: contract.id,
      result,
      stakeForfeited: evaluation.stakeForfeited,
      bonusAwarded: evaluation.bonusAwarded,
    });

    if (result === 'miss') {
      recordTelemetryEvent('contract_stake_forfeited', {
        contractId: contract.id,
        stakeAmount: evaluation.stakeForfeited,
        stakeType: contract.stakeType,
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

export async function fetchEvaluations(
  userId: string
): Promise<ServiceResponse<ContractEvaluation[]>> {
  try {
    const stored = localStorage.getItem(getEvaluationsKey(userId));
    const evaluations: ContractEvaluation[] = stored ? JSON.parse(stored) : [];
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
