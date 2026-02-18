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
  evaluateDueContracts,
  syncContractProgressWithTarget,
  getReduceStakeEligibility,
  getGentleRecoveryEligibility,
  activateGentleRampRecovery,
  resetContractWithSameSettings,
  reduceContractStake,
  type ReduceStakeEligibility,
  type GentleRecoveryEligibility,
} from '../../services/commitmentContracts';
import { ContractWizard } from './ContractWizard';
import { ContractStatusCard } from './ContractStatusCard';
import { ContractResultModal } from './ContractResultModal';
import { ContractHistoryCard } from './ContractHistoryCard';

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
  const [reduceStakeEligibility, setReduceStakeEligibility] = useState<ReduceStakeEligibility | null>(null);
  const [gentleRecoveryEligibility, setGentleRecoveryEligibility] = useState<GentleRecoveryEligibility | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [historyEvaluations, setHistoryEvaluations] = useState<ContractEvaluation[]>([]);

  useEffect(() => {
    if (profile?.total_points !== undefined) {
      setGoldBalance(profile.total_points);
    }
  }, [profile?.total_points]);

  const loadContract = async () => {
    if (!userId) return;

    const { data: dueEvaluations } = await evaluateDueContracts(userId);

    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) return;

    if (dueEvaluations && dueEvaluations.length > 0) {
      const latestEvaluation = dueEvaluations
        .slice()
        .sort((a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime())
        [dueEvaluations.length - 1];

      if (latestEvaluation) {
        const evaluatedContract = contracts.find((contract) => contract.id === latestEvaluation.contractId) ?? null;
        if (evaluatedContract) {
          setContractResult(latestEvaluation);
          setResultContract(evaluatedContract);
        }
      }
    }

    const primaryContract = pickPrimaryContract(contracts);

    if (!primaryContract) {
      setActiveContract(null);
      setHistoryEvaluations([]);
      return;
    }

    const { data: contractEvaluations } = await fetchContractEvaluations(userId, primaryContract.id);
    setHistoryEvaluations(contractEvaluations ?? []);

    let hydratedContract = primaryContract;

    if (primaryContract.status === 'active') {
      const { data: syncedContract } = await syncContractProgressWithTarget(userId, primaryContract.id);
      if (syncedContract) {
        hydratedContract = syncedContract;
      }
    }

    if (hydratedContract.status === 'active' && new Date() > getWindowEnd(hydratedContract)) {
      const { data: evaluation } = await evaluateContract(userId, primaryContract.id);
      if (evaluation) {
        const { data: refreshedContracts } = await fetchContracts(userId);
        const refreshed = refreshedContracts?.find((contract) => contract.id === hydratedContract.id) ?? null;
        setContractResult(evaluation);
        setActiveContract(refreshed);
        setResultContract(refreshed ?? hydratedContract);
        return;
      }
    }

    setActiveContract(hydratedContract);
  };

  useEffect(() => {
    void loadContract();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const intervalId = window.setInterval(() => {
      void loadContract();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [userId]);

  useEffect(() => {
    if (!userId || !resultContract || !contractResult || contractResult.result !== 'miss') {
      setReduceStakeEligibility(null);
      setGentleRecoveryEligibility(null);
      return;
    }

    const hydrateEligibility = async () => {
      const stakeEligibility = await getReduceStakeEligibility(userId, resultContract);
      setReduceStakeEligibility(stakeEligibility);
      setGentleRecoveryEligibility(getGentleRecoveryEligibility(resultContract));
    };

    void hydrateEligibility();
  }, [userId, resultContract, contractResult]);

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
      const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
      setHistoryEvaluations(refreshedEvaluations ?? []);

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
    setReduceStakeEligibility(null);
    setGentleRecoveryEligibility(null);
    setRecoveryMessage(null);
  };

  const handleResetContract = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await resetContractWithSameSettings(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to reset contract right now.');
      return;
    }

    setActiveContract(data);
    const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
    setHistoryEvaluations(refreshedEvaluations ?? []);
    setRecoveryMessage('Contract reset. Fresh window, same commitment.');
    setContractResult(null);
    setResultContract(null);
  };

  const handleReduceStake = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await reduceContractStake(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to reduce stake right now.');
      return;
    }

    setActiveContract(data);
    const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
    setHistoryEvaluations(refreshedEvaluations ?? []);
    setRecoveryMessage(`Stake reduced to ${data.stakeAmount} ${data.stakeType === 'gold' ? 'Gold' : 'Tokens'}.`);
    setContractResult(null);
    setResultContract(null);
  };


  const handleActivateGentleRecovery = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await activateGentleRampRecovery(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to start gentle ramp recovery right now.');
      return;
    }

    setActiveContract(data);
    const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
    setHistoryEvaluations(refreshedEvaluations ?? []);
    setRecoveryMessage(`Gentle ramp started. Target temporarily adjusted to ${data.targetCount} this ${data.cadence}.`);
    setContractResult(null);
    setResultContract(null);
    setReduceStakeEligibility(null);
    setGentleRecoveryEligibility(null);
  };

  const handlePauseWeek = async () => {
    if (!activeContract || !userId) return;

    const { error } = await pauseContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      return;
    }

    setContractResult(null);
    setResultContract(null);
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
          {recoveryMessage && <p className="score-tab__status">{recoveryMessage}</p>}
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

          {activeContract && !showContractWizard && (
            <ContractHistoryCard
              contract={activeContract}
              evaluations={historyEvaluations}
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
          reduceStakeEligibility={reduceStakeEligibility}
          gentleRecoveryEligibility={gentleRecoveryEligibility}
          onClose={handleContractResultClose}
          onResetContract={handleResetContract}
          onReduceStake={handleReduceStake}
          onActivateGentleRecovery={handleActivateGentleRecovery}
          onPauseWeek={handlePauseWeek}
          onCancelContract={handleCancelContract}
        />
      )}
    </section>
  );
}
