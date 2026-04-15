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
  getResetContractEligibility,
  activateGentleRampRecovery,
  resetContractWithSameSettings,
  reduceContractStake,
  recordWitnessPing,
  fetchContractSweepHealth,
  logOutcomeOnlyContractFailure,
  MAX_ACTIVE_CONTRACTS,
  type ReduceStakeEligibility,
  type GentleRecoveryEligibility,
  type ContractSweepHealth,
  type ResetContractEligibility,
} from '../../services/commitmentContracts';
import { ContractWizard } from './ContractWizard';
import { ContractStatusCard } from './ContractStatusCard';
import { ContractResultModal } from './ContractResultModal';
import { ContractHistoryCard } from './ContractHistoryCard';
import { ReputationCard } from './ReputationCard';

function buildWitnessReminder(contract: CommitmentContract): string {
  const witnessName = contract.witnessLabel ?? 'my accountability witness';
  const cadenceLabel = contract.cadence === 'daily' ? 'today' : 'this week';
  return `Hey ${witnessName} — quick contract check-in: I'm committing to ${contract.targetCount} ${contract.targetType.toLowerCase()} completions ${cadenceLabel} for "${contract.title}". A quick encouragement message from you would help me stay on track 💛`;
}

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

function buildCascadingChains(contracts: CommitmentContract[]): CommitmentContract[][] {
  const byId = new Map(contracts.map((contract) => [contract.id, contract]));
  const chainedIds = new Set<string>();
  contracts.forEach((contract) => {
    if (contract.unlocksContractId) chainedIds.add(contract.unlocksContractId);
  });

  const roots = contracts.filter((contract) => contract.contractType === 'cascading' && !chainedIds.has(contract.id));
  const chains: CommitmentContract[][] = [];

  roots.forEach((root) => {
    const chain: CommitmentContract[] = [];
    const seen = new Set<string>();
    let cursor: CommitmentContract | undefined = root;
    while (cursor && !seen.has(cursor.id)) {
      chain.push(cursor);
      seen.add(cursor.id);
      cursor = cursor.unlocksContractId ? byId.get(cursor.unlocksContractId) : undefined;
    }
    if (chain.length > 0) chains.push(chain);
  });

  return chains;
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
  const [activeContracts, setActiveContracts] = useState<CommitmentContract[]>([]);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [contractResult, setContractResult] = useState<ContractEvaluation | null>(null);
  const [resultContract, setResultContract] = useState<CommitmentContract | null>(null);
  const [reduceStakeEligibility, setReduceStakeEligibility] = useState<ReduceStakeEligibility | null>(null);
  const [gentleRecoveryEligibility, setGentleRecoveryEligibility] = useState<GentleRecoveryEligibility | null>(null);
  const [resetEligibility, setResetEligibility] = useState<ResetContractEligibility | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyEvaluations, setHistoryEvaluations] = useState<ContractEvaluation[]>([]);
  const [lastAutoCheckAt, setLastAutoCheckAt] = useState<string | null>(null);
  const [overdueCatchUpMessage, setOverdueCatchUpMessage] = useState<string | null>(null);
  const [sweepHealth, setSweepHealth] = useState<ContractSweepHealth | null>(null);

  // For single-contract actions, use the primary (first active) contract
  const activeContract = activeContracts[0] ?? null;
  const activeContractCount = activeContracts.filter((c) => c.status === 'active').length;
  const canCreateMore = activeContractCount < MAX_ACTIVE_CONTRACTS;
  const cascadingChains = buildCascadingChains(activeContracts);

  useEffect(() => {
    if (profile?.total_points !== undefined) {
      setGoldBalance(profile.total_points);
    }
  }, [profile?.total_points]);

  const loadContract = async () => {
    if (!userId) return;

    const { data: dueEvaluations } = await evaluateDueContracts();
    const { data: latestSweepHealth } = await fetchContractSweepHealth();
    setSweepHealth(latestSweepHealth);

    const { data: contracts, error } = await fetchContracts(userId);
    if (error || !contracts) return;

    if (dueEvaluations && dueEvaluations.length > 0) {
      if (dueEvaluations.length > 1) {
        setOverdueCatchUpMessage(
          `Resolved ${dueEvaluations.length} overdue contract windows while you were away.`
        );
      } else {
        setOverdueCatchUpMessage(null);
      }

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
    } else {
      setOverdueCatchUpMessage(null);
    }

    // Load all active/paused contracts (multi-contract support)
    const displayContracts = contracts.filter(
      (c) => c.status === 'active' || c.status === 'paused'
    );

    if (displayContracts.length === 0) {
      setActiveContracts([]);
      setHistoryEvaluations([]);
      return;
    }

    // Hydrate the first active contract with progress sync
    const primaryContract = displayContracts[0];
    const { data: contractEvaluations } = await fetchContractEvaluations(userId, primaryContract.id);
    setHistoryEvaluations(contractEvaluations ?? []);

    const hydratedContracts: CommitmentContract[] = [];

    for (const contract of displayContracts) {
      let hydratedContract = contract;

      if (contract.status === 'active') {
        const { data: syncedContract } = await syncContractProgressWithTarget(userId, contract.id);
        if (syncedContract) {
          hydratedContract = syncedContract;
        }
      }

      if (hydratedContract.status === 'active' && new Date() > getWindowEnd(hydratedContract)) {
        const { data: evaluation } = await evaluateContract(userId, contract.id);
        if (evaluation) {
          const { data: refreshedContracts } = await fetchContracts(userId);
          const refreshed = refreshedContracts?.find((c) => c.id === hydratedContract.id) ?? null;
          setContractResult(evaluation);
          setResultContract(refreshed ?? hydratedContract);
          if (refreshed) hydratedContract = refreshed;
        }
      }

      hydratedContracts.push(hydratedContract);
    }

    setActiveContracts(hydratedContracts);
  };

  useEffect(() => {
    void loadContract();
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      return;
    }

    const handleContractsEvaluated = (event: Event) => {
      const payload = event as CustomEvent<{
        userId?: string;
        evaluatedAt?: string;
      }>;

      if (!payload.detail || payload.detail.userId !== userId) {
        return;
      }

      setLastAutoCheckAt(payload.detail.evaluatedAt ?? new Date().toISOString());
      void loadContract();
    };

    window.addEventListener('contractsDueEvaluated', handleContractsEvaluated);

    return () => {
      window.removeEventListener('contractsDueEvaluated', handleContractsEvaluated);
    };
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
      setResetEligibility(null);
      return;
    }

    const hydrateEligibility = async () => {
      const stakeEligibility = await getReduceStakeEligibility(userId, resultContract);
      setReduceStakeEligibility(stakeEligibility);
      setGentleRecoveryEligibility(getGentleRecoveryEligibility(resultContract));
      setResetEligibility(getResetContractEligibility(resultContract));
    };

    void hydrateEligibility();
  }, [userId, resultContract, contractResult]);

  const handleContractWizardComplete = async () => {
    setShowContractWizard(false);
    await loadContract();
  };

  const refreshContractInList = (updated: CommitmentContract) => {
    setActiveContracts((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleMarkProgress = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const previousEvaluatedAt = target.lastEvaluatedAt;
    const { data, error } = await recordContractProgress(userId, target.id);
    if (error) {
      console.error('Failed to record progress:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      refreshContractInList(data);
      const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
      if (data.id === activeContract?.id) {
        setHistoryEvaluations(refreshedEvaluations ?? []);
      }

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

  const handleLogOutcomeFailure = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data: evaluation, error } = await logOutcomeOnlyContractFailure(userId, target.id);
    if (error || !evaluation) {
      setActionError(error?.message ?? 'Unable to log failure right now.');
      return;
    }

    setActionError(null);
    const { data: refreshedContracts } = await fetchContracts(userId);
    const refreshed = refreshedContracts?.find((contract) => contract.id === target.id) ?? null;
    if (refreshed) {
      refreshContractInList(refreshed);
      setResultContract(refreshed);
    }
    setContractResult(evaluation);
    await loadContract();
  };

  const handleFinalizeOutcomeSuccess = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data: evaluation, error } = await evaluateContract(userId, target.id, { forceResult: 'success' });
    if (error || !evaluation) {
      setActionError(error?.message ?? 'Unable to finalize contract right now.');
      return;
    }

    setActionError(null);
    const { data: refreshedContracts } = await fetchContracts(userId);
    const refreshed = refreshedContracts?.find((contract) => contract.id === target.id) ?? null;
    if (refreshed) {
      refreshContractInList(refreshed);
      setResultContract(refreshed);
    }
    setContractResult(evaluation);
    await loadContract();
  };

  const handlePauseContract = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data, error } = await pauseContract(userId, target.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      refreshContractInList(data);
    }
  };

  const handleResumeContract = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data, error } = await resumeContract(userId, target.id);
    if (error) {
      console.error('Failed to resume contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      refreshContractInList(data);
    }
  };

  const handleCancelContract = async (contractId?: string) => {
    const target = contractId ? activeContracts.find((c) => c.id === contractId) : activeContract;
    if (!target || !userId) return;

    const { data, error } = await cancelContract(userId, target.id);
    if (error) {
      console.error('Failed to cancel contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);

    if (data) {
      setActiveContracts((prev) => prev.filter((c) => c.id !== target.id));
    }
  };

  const handleContractResultClose = () => {
    setContractResult(null);
    setResultContract(null);
    setReduceStakeEligibility(null);
    setGentleRecoveryEligibility(null);
    setResetEligibility(null);
    setRecoveryMessage(null);
  };

  const handleResetContract = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await resetContractWithSameSettings(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to reset contract right now.');
      return;
    }

    refreshContractInList(data);
    const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
    if (data.id === activeContract?.id) {
      setHistoryEvaluations(refreshedEvaluations ?? []);
    }
    setRecoveryMessage('Contract reset. Fresh window, same commitment.');
    setContractResult(null);
    setResultContract(null);
    setResetEligibility(null);
  };

  const handleReduceStake = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await reduceContractStake(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to reduce stake right now.');
      return;
    }

    refreshContractInList(data);
    const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
    if (data.id === activeContract?.id) {
      setHistoryEvaluations(refreshedEvaluations ?? []);
    }
    setRecoveryMessage(`Stake reduced to ${data.stakeAmount} ${data.stakeType === 'gold' ? 'Gold' : 'Tokens'}.`);
    setContractResult(null);
    setResultContract(null);
    setResetEligibility(null);
  };


  const handleActivateGentleRecovery = async () => {
    if (!resultContract || !userId) return;

    const { data, error } = await activateGentleRampRecovery(userId, resultContract.id);
    if (error || !data) {
      setRecoveryMessage(error?.message ?? 'Unable to start gentle ramp recovery right now.');
      return;
    }

    refreshContractInList(data);
    const { data: refreshedEvaluations } = await fetchContractEvaluations(userId, data.id);
    if (data.id === activeContract?.id) {
      setHistoryEvaluations(refreshedEvaluations ?? []);
    }
    setRecoveryMessage(`Gentle ramp started. Target temporarily adjusted to ${data.targetCount} this ${data.cadence}.`);
    setContractResult(null);
    setResultContract(null);
    setResetEligibility(null);
    setReduceStakeEligibility(null);
    setGentleRecoveryEligibility(null);
  };


  const handleWitnessPing = async () => {
    if (!activeContract || !userId || activeContract.accountabilityMode !== 'witness') return;

    const reminderMessage = buildWitnessReminder(activeContract);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'LifeGoal Contract Check-In',
          text: reminderMessage,
        });
        await recordWitnessPing(userId, activeContract, 'share');
        setRecoveryMessage("Witness check-in shared. You're not doing this alone.");
        return;
      } catch (error) {
        console.warn('Share sheet unavailable, falling back to copy.', error);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(reminderMessage);
        await recordWitnessPing(userId, activeContract, 'clipboard');
        setRecoveryMessage("Witness reminder copied. Send it when you're ready.");
        return;
      } catch (error) {
        console.warn('Clipboard write failed.', error);
      }
    }

    setRecoveryMessage('Could not open share/copy in this browser. You can still message your witness manually.');
  };

  const handlePauseWeek = async () => {
    if (!activeContract || !userId) return;

    const { data, error } = await pauseContract(userId, activeContract.id);
    if (error) {
      console.error('Failed to pause contract:', error);
      setActionError(error.message);
      return;
    }

    setActionError(null);
    setContractResult(null);
    setResultContract(null);
    if (data) {
      refreshContractInList(data);
    }
  };

  const getSweepHealthCopy = () => {
    if (!sweepHealth) {
      return 'Server sweep status will appear after the first scheduled run.';
    }

    const relativeLabel = new Date(sweepHealth.triggeredAt).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (sweepHealth.status === 'success') {
      return `Latest server sweep succeeded at ${relativeLabel} (${sweepHealth.usersProcessed} users checked).`;
    }

    if (sweepHealth.status === 'running') {
      return `A server sweep is currently running (started ${relativeLabel}).`;
    }

    if (sweepHealth.status === 'partial') {
      return `Latest server sweep was partial at ${relativeLabel} (${sweepHealth.failedUsers} user failures captured).`;
    }

    return `Latest server sweep failed at ${relativeLabel}. Reliability fallbacks remain active in-app.`;
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
            <p className="score-tab__meta">
              Auto-checks run every minute while the app is open, with server-backed due-window sweeps for durability.
              Sweep runs are audit-logged for reliability monitoring.
              {lastAutoCheckAt ? ` Last check: ${new Date(lastAutoCheckAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : ''}
            </p>
            <p className="score-tab__meta">{getSweepHealthCopy()}</p>
          </div>
          {recoveryMessage && <p className="score-tab__status">{recoveryMessage}</p>}
          {actionError && <p className="score-tab__status">{actionError}</p>}
          {overdueCatchUpMessage && <p className="score-tab__status">{overdueCatchUpMessage}</p>}
          {activeContracts.length === 0 && !showContractWizard && (
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
          {activeContracts.length > 0 && !showContractWizard && (
            <>
              {activeContracts.map((contract) => (
                <ContractStatusCard
                  key={contract.id}
                  contract={contract}
                  onMarkProgress={() => void handleMarkProgress(contract.id)}
                  onLogFailure={() => void handleLogOutcomeFailure(contract.id)}
                  onFinalizeSuccess={() => void handleFinalizeOutcomeSuccess(contract.id)}
                  onPause={() => void handlePauseContract(contract.id)}
                  onResume={() => void handleResumeContract(contract.id)}
                  onCancel={() => void handleCancelContract(contract.id)}
                  onWitnessPing={handleWitnessPing}
                />
              ))}

              {cascadingChains.length > 0 && (
                <section className="score-tab__chain-viz" aria-live="polite">
                  <h3 className="score-tab__chain-viz-title">Cascading contract chain</h3>
                  {cascadingChains.map((chain) => (
                    <p key={chain.map((contract) => contract.id).join('>')} className="score-tab__chain-viz-item">
                      {chain.map((contract) => contract.title).join(' → ')}
                    </p>
                  ))}
                </section>
              )}

              {activeContracts[0] && (
                <ContractHistoryCard
                  contract={activeContracts[0]}
                  evaluations={historyEvaluations}
                />
              )}

              {canCreateMore && (
                <div className="score-tab__contracts-add">
                  <button
                    type="button"
                    className="score-tab__contracts-create-button"
                    onClick={() => setShowContractWizard(true)}
                  >
                    + Add Contract ({activeContractCount}/{MAX_ACTIVE_CONTRACTS})
                  </button>
                </div>
              )}
            </>
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

          {userId && !showContractWizard && (
            <ReputationCard userId={userId} />
          )}
        </div>
      )}

      {contractResult && resultContract && (
        <ContractResultModal
          contract={resultContract}
          evaluation={contractResult}
          resetEligibility={resetEligibility}
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
