import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  GamificationProfile,
  CommitmentContract,
  ContractEvaluation,
} from '../../types/gamification';
import {
  fetchContracts,
  fetchContractEvaluations,
  recordContractProgress,
  pauseContract,
  cancelContract,
  resumeContract,
  evaluateContract,
} from '../../services/commitmentContracts';
import { ContractWizard } from './ContractWizard';
import { ContractStatusCard } from './ContractStatusCard';
import { ContractResultModal } from './ContractResultModal';

interface ContractsTabProps {
  session: Session | null;
  profile: GamificationProfile | null;
  enabled: boolean;
  loading: boolean;
}

function getWindowEnd(contract: CommitmentContract): Date {
  const windowStart = new Date(contract.currentWindowStart);
  const end = new Date(windowStart);

  if (contract.cadence === 'daily') {
    end.setHours(23, 59, 59, 999);
  } else {
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  return end;
}

function pickPrimaryContract(contracts: CommitmentContract[]): CommitmentContract | null {
  const active = contracts.find((contract) => contract.status === 'active');
  if (active) return active;

  const paused = contracts
    .filter((contract) => contract.status === 'paused')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return paused[0] ?? null;
}

export function ContractsTab({
  session,
  profile,
  enabled,
  loading,
}: ContractsTabProps) {
  const userId = session?.user?.id ?? profile?.user_id ?? '';
  const zenTokens = profile?.zen_tokens ?? 0;
  const [goldBalance, setGoldBalance] = useState(profile?.total_points ?? 0);
  const [activeContract, setActiveContract] = useState<CommitmentContract | null>(null);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [contractResult, setContractResult] = useState<ContractEvaluation | null>(null);
  const [resultContract, setResultContract] = useState<CommitmentContract | null>(null);

  useEffect(() => {
    if (profile?.total_points !== undefined) {
      setGoldBalance(profile.total_points);
    }
  }, [profile?.total_points]);

  useEffect(() => {
    if (!userId) return;

    const loadContract = async () => {
      const { data: contracts, error } = await fetchContracts(userId);
      if (error || !contracts) return;

      const primaryContract = pickPrimaryContract(contracts);

      if (!primaryContract) {
        setActiveContract(null);
        return;
      }

      if (primaryContract.status === 'active' && new Date() > getWindowEnd(primaryContract)) {
        const { data: evaluation } = await evaluateContract(userId, primaryContract.id);
        if (evaluation) {
          setContractResult(evaluation);
          const { data: refreshedContracts } = await fetchContracts(userId);
          const refreshed = refreshedContracts?.find((contract) => contract.id === primaryContract.id) ?? null;
          setActiveContract(refreshed);
          setResultContract(refreshed ?? primaryContract);
          return;
        }
      }

      setActiveContract(primaryContract);
    };

    void loadContract();
  }, [userId]);

  // Contract handlers
  const handleContractWizardComplete = async () => {
    setShowContractWizard(false);
    const { data: contracts } = await fetchContracts(userId);
    setActiveContract(contracts ? pickPrimaryContract(contracts) : null);
  };

  const handleMarkProgress = async () => {
    if (!activeContract || !userId) return;

    const previousEvaluatedAt = activeContract.lastEvaluatedAt;
    const { data, error } = await recordContractProgress(userId, activeContract.id);
    if (error) {
      console.error('Failed to record progress:', error);
      return;
    }

    if (data) {
      setActiveContract(data);

      if (data.lastEvaluatedAt && data.lastEvaluatedAt !== previousEvaluatedAt) {
        const { data: evaluations } = await fetchContractEvaluations(userId, data.id);
        const latestEvaluation = evaluations?.[evaluations.length - 1] ?? null;
        if (latestEvaluation) {
          setContractResult(latestEvaluation);
          setResultContract(data);
        }
      }
    }
  };

  const handlePauseContract = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await pauseContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      return;
    }

    if (data) {
      setActiveContract(data);
    }
  };

  const handleResumeContract = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await resumeContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to resume contract:', error);
      return;
    }

    if (data) {
      setActiveContract(data);
    }
  };

  const handleCancelContract = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await cancelContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to cancel contract:', error);
      return;
    }

    if (data) {
      setActiveContract(null);
    }
  };

  const handleContractResultClose = () => {
    setContractResult(null);
    setResultContract(null);
  };

  const handleResetContract = async () => {
    if (!activeContract || !userId) return;

    // TODO: Implement reset contract with same settings
    // This should create a new contract with identical parameters
    console.log('Reset contract with same settings');
    setContractResult(null);
    setResultContract(null);
  };

  const handleReduceStake = async () => {
    if (!activeContract || !userId) return;

    // TODO: Implement reduce stake (one-time option for users with 2+ misses)
    // This should allow the user to modify the stake amount downward
    console.log('Reduce stake amount');
    setContractResult(null);
    setResultContract(null);
  };

  const handlePauseWeek = async () => {
    if (!activeContract || !userId) return;

    // Pause contract for a week
    const { error } = await pauseContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      return;
    }

    setContractResult(null);
    setResultContract(null);
    // Reload to reflect paused state
    const { data: contracts } = await fetchContracts(userId);
    setActiveContract(contracts ? pickPrimaryContract(contracts) : null);
  };

  return (
    <section className="score-tab">
      <header className="score-tab__header">
        <div className="score-tab__title">
          <span className="score-tab__badge" aria-hidden="true">🤝</span>
          <div>
            <p className="score-tab__eyebrow">Accountability</p>
            <h2 className="score-tab__headline">Commitment Contracts</h2>
          </div>
        </div>
      </header>

      {loading && (
        <div className="score-tab__status" role="status">
          Loading your contracts...
        </div>
      )}

      {!loading && !enabled && (
        <div className="score-tab__status">
          Gamification is currently disabled. Enable it in settings to use contracts.
        </div>
      )}

      {!loading && enabled && (
        <div className="score-tab__content">
          <div className="score-tab__contracts-header">
            <p className="score-tab__subtitle">
              Stake Gold or Tokens to stay accountable to your goals.
            </p>
          </div>
          {!activeContract && !showContractWizard && (
            <div className="score-tab__contracts-empty">
              <p className="score-tab__contracts-empty-text">
                No active contract yet. Ready to commit?
              </p>
              <button
                type="button"
                className="score-tab__contracts-create-button"
                onClick={() => setShowContractWizard(true)}
              >
                Create Contract
              </button>
            </div>
          )}
          {activeContract && !showContractWizard && (
            <ContractStatusCard
              contract={activeContract}
              onMarkProgress={handleMarkProgress}
              onPause={handlePauseContract}
              onResume={handleResumeContract}
              onCancel={handleCancelContract}
            />
          )}
          {showContractWizard && (
            <ContractWizard
              userId={userId}
              currentGoldBalance={goldBalance}
              currentTokenBalance={zenTokens}
              onComplete={handleContractWizardComplete}
              onCancel={() => setShowContractWizard(false)}
            />
          )}
        </div>
      )}

      {contractResult && resultContract && (
        <ContractResultModal
          contract={resultContract}
          evaluation={contractResult}
          onClose={handleContractResultClose}
          onResetContract={handleResetContract}
          onReduceStake={handleReduceStake}
          onPauseWeek={handlePauseWeek}
          onCancelContract={handleCancelContract}
        />
      )}
    </section>
  );
}
